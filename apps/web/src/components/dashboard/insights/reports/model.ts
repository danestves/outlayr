import { CATEGORY_PALETTE } from "@outlayr/money/category-rules";
import { merchantKey } from "@outlayr/money/merchant-key";
import * as Schema from "effect/Schema";

import { round, rowsOf, UNCATEGORIZED_ID } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "../../../../lib/dashboard-series-ledger";
import { periodKeyOf, periodOf, shiftPeriodKey, weekKeyOf } from "../../../../lib/dashboard-series-period";
import { addDays } from "../../../../lib/ledger";

export const MEASURES = ["spending", "income", "net", "count", "average"] as const;
export const DIMENSIONS = ["category", "subcategory", "merchant", "tag", "account"] as const;
export const GROUPINGS = ["week", "month", "quarter", "year", "none"] as const;

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ROLLING_MONTHS = 120;
const MONTHS_IN_QUARTER = 3;
const DAYS_IN_WEEK = 7;
const MIN_COLUMNS_TO_COMPARE = 3;
const MAX_ROWS = 12;
const PALETTE_STEP = 5;

const MonthKey = Schema.String.check(Schema.isPattern(MONTH_KEY));

export const Range = Schema.Union([
    Schema.Struct({ from: MonthKey, to: MonthKey }),
    Schema.Struct({ last: Schema.Int.check(Schema.isBetween({ maximum: MAX_ROLLING_MONTHS, minimum: 1 })) }),
]);

export const Definition = Schema.Struct({
    accounts: Schema.Array(Schema.String),
    columns: Schema.Literals(GROUPINGS),
    measure: Schema.Literals(MEASURES),
    range: Range,
    rows: Schema.Literals(DIMENSIONS),
    tags: Schema.Array(Schema.String),
});

export type Definition = typeof Definition.Type;
export type Measure = Definition["measure"];
export type Dimension = Definition["rows"];
export type Grouping = Definition["columns"];
export type ReportRange = Definition["range"];

export interface Span {
    from: string;
    to: string;
}

/** A rolling range ends in the current month; a fixed one is kept inside the months that have started. */
export function spanOf(range: ReportRange, currentKey: string): Span {
    if ("last" in range) {
        return { from: shiftPeriodKey(currentKey, -(range.last - 1)), to: currentKey };
    }
    const to = range.to < currentKey ? range.to : currentKey;
    const from = range.from < to ? range.from : to;
    return { from, to };
}

export const monthsIn = ({ from, to }: Span) => {
    const [fromYear = 0, fromMonth = 1] = from.split("-").map(Number);
    const [toYear = 0, toMonth = 1] = to.split("-").map(Number);
    return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
};

export type Special = "noMerchant" | "noAccount" | "other" | "uncategorized" | "untagged";

export interface Label {
    color: string | null;
    id: string;
    name: string;
    special: Special | null;
}

export interface Column {
    from: string;
    key: string;
    to: string;
}

export interface ReportRow {
    /** The last column against this row's average, or null when there is nothing to compare. */
    change: number | null;
    label: Label;
    total: number;
    values: number[];
    average: number;
}

export interface Source {
    column: number;
    row: LedgerRow;
}

export interface Rise {
    delta: number;
    label: Label;
}

export interface Report {
    columns: Column[];
    entries: number;
    measure: Measure;
    /** The row with the biggest climb from the first column to the last. */
    rise: Rise | null;
    rows: ReportRow[];
    sources: Source[];
    totals: ReportRow;
}

export interface TagBooks {
    links: readonly { deletedAt: number | null; tagId: string; transactionId: string }[];
    tags: readonly {
        color: string | null;
        deletedAt: number | null;
        localId: string;
        name: string;
        sortOrder: number;
    }[];
}

interface Sums {
    earned: number;
    entries: number;
    spent: number;
}

const emptySums = (): Sums => ({ earned: 0, entries: 0, spent: 0 });

function valueOf(ledger: Pick<Ledger, "currency">, sums: Sums, measure: Measure) {
    switch (measure) {
        case "spending": {
            return round(ledger, sums.spent);
        }
        case "income": {
            return round(ledger, sums.earned);
        }
        case "net": {
            return round(ledger, sums.earned - sums.spent);
        }
        case "count": {
            return sums.entries;
        }
        default: {
            return sums.entries === 0 ? 0 : round(ledger, sums.spent / sums.entries);
        }
    }
}

const quarterOf = (month: string) => {
    const [year = "", number = "1"] = month.split("-");
    return `${year}-Q${Math.ceil(Number(number) / MONTHS_IN_QUARTER)}`;
};

export function columnsOf(
    grouping: Grouping,
    span: Span,
    calendar: Pick<Ledger, "firstDayOfMonth" | "firstWeekday" | "today">
): Column[] {
    const start = periodOf(span.from, calendar.firstDayOfMonth).from;
    const last = periodOf(span.to, calendar.firstDayOfMonth).to;
    const end = last < calendar.today ? last : calendar.today;
    if (grouping === "none") {
        return [{ from: start, key: "all", to: end }];
    }
    if (grouping === "week") {
        const columns: Column[] = [];
        for (let key = weekKeyOf(start, calendar.firstWeekday); key <= end; key = addDays(key, DAYS_IN_WEEK)) {
            const closes = addDays(key, DAYS_IN_WEEK - 1);
            columns.push({ from: key < start ? start : key, key, to: closes < end ? closes : end });
        }
        return columns;
    }
    const columns = new Map<string, Column>();
    for (let month = span.from; month <= span.to; month = shiftPeriodKey(month, 1)) {
        const key = columnKeyOfMonth(grouping, month);
        const { from, to } = periodOf(month, calendar.firstDayOfMonth);
        const kept = columns.get(key);
        columns.set(key, { from: kept?.from ?? from, key, to });
    }
    return [...columns.values()];
}

function columnKeyOfMonth(grouping: Exclude<Grouping, "none" | "week">, month: string) {
    if (grouping === "year") {
        return month.slice(0, 4);
    }
    return grouping === "quarter" ? quarterOf(month) : month;
}

const columnKeyOfDay = (
    grouping: Grouping,
    day: string,
    calendar: Pick<Ledger, "firstDayOfMonth" | "firstWeekday">
) => {
    if (grouping === "none") {
        return "all";
    }
    if (grouping === "week") {
        return weekKeyOf(day, calendar.firstWeekday);
    }
    return columnKeyOfMonth(grouping, periodKeyOf(day, calendar.firstDayOfMonth));
};

interface Context {
    categories: ReadonlyMap<string, { color: string | null; name: string | null; parentId: string | null }>;
    ledger: Ledger;
    tagIds: ReadonlyMap<string, readonly string[]>;
    tags: ReadonlyMap<string, { color: string | null; name: string }>;
}

function contextOf(ledger: Ledger, books: TagBooks): Context {
    const tags = new Map(books.tags.filter((tag) => tag.deletedAt === null).map((tag) => [tag.localId, tag]));
    const tagIds = new Map<string, string[]>();
    for (const link of books.links) {
        if (link.deletedAt !== null || !tags.has(link.tagId)) {
            continue;
        }
        const same = tagIds.get(link.transactionId);
        if (same) {
            same.push(link.tagId);
        } else {
            tagIds.set(link.transactionId, [link.tagId]);
        }
    }
    return {
        categories: new Map(
            ledger.books.categories
                .filter((row) => row.deletedAt === null)
                .map((row) => [row.localId, { color: row.color ?? null, name: row.name, parentId: row.parentId }])
        ),
        ledger,
        tagIds,
        tags,
    };
}

const special = (id: string, name: string, kind: Special, color: string | null | undefined = null): Label => ({
    color: color ?? null,
    id,
    name,
    special: kind,
});

function labelsOf(dimension: Dimension, row: LedgerRow, context: Context): Label[] {
    const { categories, ledger, tagIds, tags } = context;
    switch (dimension) {
        case "category": {
            const top = ledger.categories.get(row.topId);
            return [
                row.topId === UNCATEGORIZED_ID
                    ? special(row.topId, "", "uncategorized", top?.color)
                    : { color: top?.color ?? null, id: row.topId, name: top?.name ?? "", special: null },
            ];
        }
        case "subcategory": {
            const leaf = row.categoryId === null ? undefined : categories.get(row.categoryId);
            if (row.parentId === null || row.categoryId === null || !leaf) {
                const top = ledger.categories.get(row.topId);
                return [
                    row.topId === UNCATEGORIZED_ID
                        ? special(row.topId, "", "uncategorized", top?.color)
                        : { color: top?.color ?? null, id: row.topId, name: top?.name ?? "", special: null },
                ];
            }
            return [
                {
                    color: leaf.color ?? ledger.categories.get(row.topId)?.color ?? null,
                    id: row.categoryId,
                    name: leaf.name ?? "",
                    special: null,
                },
            ];
        }
        case "merchant": {
            const key = merchantKey(row.note);
            return [
                key === ""
                    ? special("", "", "noMerchant")
                    : { color: null, id: key, name: row.note.trim(), special: null },
            ];
        }
        case "tag": {
            const ids = tagIds.get(row.id) ?? [];
            if (ids.length === 0) {
                return [special("", "", "untagged")];
            }
            return ids.map((id): Label => ({
                color: tags.get(id)?.color ?? null,
                id,
                name: tags.get(id)?.name ?? "",
                special: null,
            }));
        }
        default: {
            const account = row.accountId === null ? undefined : ledger.accounts.get(row.accountId);
            return [
                row.accountId === null || !account
                    ? special("", "", "noAccount")
                    : { color: null, id: row.accountId, name: account.name, special: null },
            ];
        }
    }
}

interface Placed {
    column: number;
    keys: readonly string[];
    row: LedgerRow;
}

const add = (sums: Sums, row: LedgerRow) => {
    sums.entries += 1;
    if (row.income) {
        sums.earned += row.amount;
    } else {
        sums.spent += row.amount;
    }
};

function sumsOf(columns: number, placed: readonly Placed[]) {
    const cells = Array.from({ length: columns }, emptySums);
    const all = emptySums();
    for (const { column, row } of placed) {
        const cell = cells[column];
        if (cell) {
            add(cell, row);
        }
        add(all, row);
    }
    return { all, cells };
}

function rowOf(ledger: Ledger, measure: Measure, label: Label, placed: readonly Placed[], columns: number): ReportRow {
    const { all, cells } = sumsOf(columns, placed);
    const values = cells.map((each) => valueOf(ledger, each, measure));
    const total = valueOf(ledger, all, measure);
    const average = measure === "average" ? total : round(ledger, total / Math.max(columns, 1));
    const last = values.at(-1);
    const change = columns >= MIN_COLUMNS_TO_COMPARE && last !== undefined && average > 0 ? last / average - 1 : null;
    return { average, change, label, total, values };
}

export interface ReportInput {
    books: TagBooks;
    definition: Definition;
    ledger: Ledger;
}

const incomeFlagsOf = (measure: Measure) => {
    if (measure === "income") {
        return [true];
    }
    return measure === "net" ? [false, true] : [false];
};

export function buildReport({ books, definition, ledger }: ReportInput): Report {
    const { accounts, columns: grouping, measure, rows: dimension, tags } = definition;
    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    const columns = columnsOf(grouping, spanOf(definition.range, currentKey), ledger);
    const indexOf = new Map(columns.map((column, index) => [column.key, index]));
    const first = columns[0]?.from ?? ledger.today;
    const last = columns.at(-1)?.to ?? ledger.today;
    const context = contextOf(ledger, books);
    const wanted = new Set(tags);
    const kinds = incomeFlagsOf(measure);
    const labels = new Map<string, Label>();
    const latest = new Map<string, number>();
    const placed: Placed[] = [];
    for (const income of kinds) {
        for (const row of rowsOf(ledger, { accounts }, income)) {
            const column = indexOf.get(columnKeyOfDay(grouping, row.day, ledger));
            const tagged = context.tagIds.get(row.id) ?? [];
            if (column === undefined || row.day < first || row.day > last) {
                continue;
            }
            if (wanted.size > 0 && !tagged.some((id) => wanted.has(id))) {
                continue;
            }
            const found = labelsOf(dimension, row, context);
            for (const label of found) {
                if (row.at >= (latest.get(label.id) ?? 0)) {
                    labels.set(label.id, label);
                    latest.set(label.id, row.at);
                }
            }
            placed.push({ column, keys: found.map((label) => label.id), row });
        }
    }
    const byKey = Map.groupBy(
        placed.flatMap((item) => item.keys.map((key) => ({ item, key }))),
        ({ key }) => key
    );
    const ranked = [...byKey.entries()]
        .map(([key, members]) =>
            rowOf(
                ledger,
                measure,
                labels.get(key) ?? special(key, "", "other"),
                members.map(({ item }) => item),
                columns.length
            )
        )
        .toSorted((a, b) => b.total - a.total || a.label.name.localeCompare(b.label.name));
    const folds = ranked.length > MAX_ROWS && dimension !== "category" && dimension !== "account";
    const kept = folds ? ranked.slice(0, MAX_ROWS - 1) : ranked;
    const keptKeys = new Set(kept.map((row) => row.label.id));
    const rest = placed.filter((item) => item.keys.some((key) => !keptKeys.has(key)));
    const shown = folds ? [...kept, rowOf(ledger, measure, special("other", "", "other"), rest, columns.length)] : kept;
    const rows = shown.map((row, index) => ({
        ...row,
        label: {
            ...row.label,
            color: row.label.color ?? CATEGORY_PALETTE[(index * PALETTE_STEP) % CATEGORY_PALETTE.length] ?? null,
        },
    }));
    return {
        columns,
        entries: placed.length,
        measure,
        rise: riseOf(ledger, rows),
        rows,
        sources: placed.map(({ column, row }) => ({ column, row })),
        totals: rowOf(ledger, measure, special("total", "", "other"), placed, columns.length),
    };
}

function riseOf(ledger: Ledger, rows: readonly ReportRow[]): Rise | null {
    let best: Rise | null = null;
    for (const { label, values } of rows) {
        const [start] = values;
        const end = values.at(-1);
        if (values.length < 2 || start === undefined || end === undefined) {
            continue;
        }
        const delta = round(ledger, end - start);
        if (delta > (best?.delta ?? 0)) {
            best = { delta, label };
        }
    }
    return best;
}

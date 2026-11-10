import { capitalizeCategoryName } from "@outlayr/money/category-rules";
import {
    deduceDateFormat,
    detectDecimalSeparator,
    parseCsv,
    parseCsvAmount,
    parseCsvDate,
    parseCsvType,
} from "@outlayr/money/csv-read";
import type { DecimalSeparator } from "@outlayr/money/csv-read";
import { fromWall, isoDay } from "@outlayr/money/ledger-zone";
import type { OffsetAt } from "@outlayr/money/ledger-zone";
import { merchantKey } from "@outlayr/money/merchant-key";

/** Folded, so "Food" and "food " name one category. */
export const categoryKey = (value: string) => capitalizeCategoryName(value).toLowerCase();

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_COLUMNS = 3;
const SAMPLE_ROWS = 40;

export const FIELDS = [
    "date",
    "merchant",
    "category",
    "amount",
    "amountOut",
    "amountIn",
    "type",
    "currency",
    "account",
    "balance",
] as const;
export type Field = (typeof FIELDS)[number];
export type Target = Field | "skip";

export interface CsvFile {
    header: readonly string[];
    rows: readonly (readonly string[])[];
    width: number;
}

export type FileProblem = "fewColumns" | "noRows" | "notCsv" | "tooLarge";

const ANY_DIGIT = /\d/;
const NOTION_LINK = /\s\((?:https:\/\/(?:www\.|app\.)?notion\.(?:so|com|site)\/[^\s)]*|[^\s()]+\.md)\)/g;

const TAB = 9;
const CARRIAGE_RETURN = 13;
const SPACE = 32;

/** Control characters other than tabs and line breaks only turn up in binary files. */
const looksBinary = (text: string) =>
    [...text].some((char) => {
        const code = char.codePointAt(0) ?? SPACE;
        return code < TAB || (code > CARRIAGE_RETURN && code < SPACE);
    });

/** A first line with no digit is a header, because a data row always carries a date or an amount. */
export function readCsvText(text: string): { file: CsvFile; ok: true } | { ok: false; problem: FileProblem } {
    if (looksBinary(text.slice(0, 4096))) {
        return { ok: false, problem: "notCsv" };
    }
    const lines = parseCsv(text).map((line) => line.map((cell) => cell.replaceAll(NOTION_LINK, "")));
    const [first] = lines;
    if (first === undefined) {
        return { ok: false, problem: "noRows" };
    }
    const named = !ANY_DIGIT.test(first.join(""));
    const rows = named ? lines.slice(1) : lines;
    if (rows.length === 0) {
        return { ok: false, problem: "noRows" };
    }
    const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
    if (width < MIN_COLUMNS) {
        return { ok: false, problem: lines.every((line) => line.length === 1) ? "notCsv" : "fewColumns" };
    }
    const header = Array.from({ length: width }, (_, index) => (named ? first[index]?.trim() : "") || `${index + 1}`);
    return { file: { header, rows, width }, ok: true };
}

export const columnValues = (file: CsvFile, column: number, limit = SAMPLE_ROWS) =>
    file.rows
        .slice(0, limit)
        .map((row) => row[column]?.trim() ?? "")
        .filter((value) => value !== "");

const COMBINING_MARKS = /\p{M}/gu;
const fold = (text: string) => text.trim().normalize("NFD").replaceAll(COMBINING_MARKS, "").toLowerCase();

// Specific labels go before the general ones they contain: "debit" before "amount", "description" before "details".
const HINTS: readonly (readonly [Field, readonly string[]])[] = [
    ["balance", ["balance", "saldo"]],
    ["amountOut", ["debit", "withdrawal", "cargo", "retiro", "debito", "salida", "money out", "paid out"]],
    ["amountIn", ["credit", "deposit", "abono", "deposito", "ingreso", "entrada", "money in", "paid in"]],
    ["currency", ["currency", "moneda", "moeda", "divisa", "ccy"]],
    ["account", ["account", "cuenta", "conta", "card", "tarjeta", "cartao"]],
    ["date", ["date", "fecha", "data", "posted", "time", "when"]],
    ["amount", ["amount", "value", "total", "sum", "monto", "importe", "valor", "price", "cost"]],
    ["category", ["category", "categories", "categoria", "tag", "etiqueta"]],
    ["type", ["type", "direction", "kind", "tipo"]],
    [
        "merchant",
        [
            "description",
            "merchant",
            "payee",
            "memo",
            "name",
            "concepto",
            "descripcion",
            "descricao",
            "detalle",
            "comercio",
            "nombre",
            "nome",
            "note",
            "details",
        ],
    ],
];

const MOST = 0.6;

function fits(field: Field, values: readonly string[], decimal: DecimalSeparator) {
    if (values.length === 0) {
        return field === "amountIn" || field === "amountOut";
    }
    const share = (test: (value: string) => boolean) => values.filter(test).length / values.length >= MOST;
    switch (field) {
        case "date": {
            return deduceDateFormat(values) !== null;
        }
        case "amount":
        case "amountIn":
        case "amountOut":
        case "balance": {
            return share((value) => parseCsvAmount(value, decimal) !== null);
        }
        case "type": {
            return share((value) => parseCsvType(value) !== null);
        }
        case "currency": {
            return share((value) => /^[A-Za-z]{3}$/.test(value.trim()));
        }
        default: {
            return true;
        }
    }
}

/** What each column feeds, guessed from its header and checked against its values. */
export function guessTargets(file: CsvFile): Target[] {
    const names = file.header.map(fold);
    const decimal = decimalOf(
        file,
        file.header.map((_, index) => index)
    );
    const targets: Target[] = file.header.map(() => "skip");
    for (const [field, hints] of HINTS) {
        const column = hints
            .map((hint) => names.findIndex((name, at) => targets[at] === "skip" && name.includes(hint)))
            .find((at) => at !== -1 && fits(field, columnValues(file, at), decimal));
        if (column !== undefined) {
            targets[column] = field;
        }
    }
    if (targets.includes("amountOut") !== targets.includes("amountIn")) {
        const lone = targets.findIndex((target) => target === "amountOut" || target === "amountIn");
        targets[lone] = targets.includes("amount") ? "skip" : "amount";
    }
    if (targets.includes("amount") && targets.includes("amountOut")) {
        targets[targets.indexOf("amount")] = "skip";
    }
    return fillGaps(file, targets, decimal);
}

/** A headerless file still maps: the first column that reads as each required field takes it. */
function fillGaps(file: CsvFile, targets: Target[], decimal: DecimalSeparator) {
    const take = (field: Field, test: (values: readonly string[]) => boolean) => {
        if (targets.includes(field)) {
            return;
        }
        const column = targets.findIndex((target, at) => target === "skip" && test(columnValues(file, at)));
        if (column !== -1) {
            targets[column] = field;
        }
    };
    take("date", (values) => fits("date", values, decimal) && values.length > 0);
    if (!targets.includes("amountOut")) {
        take("amount", (values) => values.length > 0 && fits("amount", values, decimal));
    }
    if (!targets.includes("category")) {
        take("merchant", (values) => values.some((value) => !ANY_DIGIT.test(value) || /\p{L}{3}/u.test(value)));
    }
    return targets;
}

export type Need = "amount" | "date" | "label";

export function missingNeeds(targets: readonly Target[]): Need[] {
    const has = (field: Field) => targets.includes(field);
    const needs: Need[] = [];
    if (!has("date")) {
        needs.push("date");
    }
    if (!has("merchant") && !has("category")) {
        needs.push("label");
    }
    if (!has("amount") && !has("amountOut") && !has("amountIn")) {
        needs.push("amount");
    }
    return needs;
}

/** One column per field: picking a field for a column frees whichever column held it. */
export function retargeted(targets: readonly Target[], column: number, target: Target): Target[] {
    return targets.map((current, at) => {
        if (at === column) {
            return target;
        }
        return target !== "skip" && current === target ? "skip" : current;
    });
}

export const decimalOf = (file: CsvFile, columns: readonly number[]) =>
    detectDecimalSeparator(columns.flatMap((column) => columnValues(file, column)));

const amountColumns = (targets: readonly Target[]) =>
    targets.flatMap((target, at) =>
        target === "amount" || target === "amountIn" || target === "amountOut" || target === "balance" ? [at] : []
    );

export type DateRead =
    | { kind: "ambiguous"; dayFirst: string; monthFirst: string }
    | { format: string; kind: "known" }
    | { kind: "unreadable" };

const swapDayMonth = (format: string) => format.replace("MM", "§").replace("dd", "MM").replace("§", "dd");

/** `MM/dd` wins a column with no day past 12, so this says when the day-first reading fits every row too. */
export function readDates(values: readonly string[]): DateRead {
    const format = deduceDateFormat(values);
    if (format === null) {
        return { kind: "unreadable" };
    }
    if (!format.startsWith("MM")) {
        return { format, kind: "known" };
    }
    const dayFirst = swapDayMonth(format);
    const both = values.every((value) => parseCsvDate(value, dayFirst) !== null);
    const differ = values.some((value) => {
        const a = parseCsvDate(value, format);
        const b = parseCsvDate(value, dayFirst);
        return a !== null && b !== null && a.getTime() !== b.getTime();
    });
    return both && differ ? { dayFirst, kind: "ambiguous", monthFirst: format } : { format, kind: "known" };
}

export function dateOrder(format: string): "dayFirst" | "iso" | "monthFirst" | "other" {
    if (format === "ISO" || format.startsWith("yyyy")) {
        return "iso";
    }
    if (format.startsWith("MM")) {
        return "monthFirst";
    }
    return format.startsWith("dd") || format.startsWith("d ") ? "dayFirst" : "other";
}

export interface FileRow {
    account: string | null;
    amount: number;
    at: number;
    balance: number | null;
    category: string | null;
    currency: string | null;
    /** The text the user sees in the file, so a fix can show what was there. */
    dateText: string;
    income: boolean;
    index: number;
    label: string;
}

export type RowFault = "amount" | "date";

export interface FaultyRow extends Omit<FileRow, "amount" | "at"> {
    amount: number | null;
    fault: RowFault;
}

export interface ReadOptions {
    dateFormat: string;
    offsetAt: OffsetAt;
}

const CURRENCY_CODE = /^[A-Za-z]{3}$/;

/** A wall clock reading from the file, filed on the ledger's day rather than the browser's. */
export function ledgerInstant(date: Date, offsetAt: OffsetAt) {
    const wallMs = Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    );
    return fromWall(wallMs, offsetAt);
}

const STATED_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** A timestamp that names its own zone is already an instant; anything else is a wall clock reading. */
function fileInstant(text: string, date: Date, { dateFormat, offsetAt }: ReadOptions) {
    return dateFormat === "ISO" && STATED_ZONE.test(text.trim()) ? date.getTime() : ledgerInstant(date, offsetAt);
}

function signedAmount(row: readonly string[], targets: readonly Target[], decimal: DecimalSeparator) {
    const cell = (field: Field) => {
        const at = targets.indexOf(field);
        return at === -1 ? "" : (row[at]?.trim() ?? "");
    };
    const out = cell("amountOut");
    const into = cell("amountIn");
    if (targets.includes("amountOut") || targets.includes("amountIn")) {
        const outValue = out === "" ? null : parseCsvAmount(out, decimal);
        const inValue = into === "" ? null : parseCsvAmount(into, decimal);
        if (outValue !== null && outValue !== 0) {
            return -Math.abs(outValue);
        }
        return inValue === null ? null : Math.abs(inValue);
    }
    const value = parseCsvAmount(cell("amount"), decimal);
    const declared = targets.includes("type") ? parseCsvType(cell("type")) : null;
    if (value === null || declared === null) {
        return value;
    }
    return declared ? Math.abs(value) : -Math.abs(value);
}

/** Every data row, read or set aside with what stopped it. A guessed date is indistinguishable from a real one. */
export function readRows(file: CsvFile, targets: readonly Target[], options: ReadOptions) {
    const decimal = decimalOf(file, amountColumns(targets));
    const text = (row: readonly string[], field: Field) => {
        const at = targets.indexOf(field);
        const value = at === -1 ? "" : (row[at]?.trim() ?? "");
        return value === "" ? null : value;
    };
    const rows: FileRow[] = [];
    const faulty: FaultyRow[] = [];
    for (const [index, row] of file.rows.entries()) {
        const category = text(row, "category");
        const label = text(row, "merchant") ?? category ?? "";
        const currencyText = text(row, "currency");
        const balanceText = text(row, "balance");
        const dateText = text(row, "date") ?? "";
        const signed = signedAmount(row, targets, decimal);
        const base = {
            account: text(row, "account"),
            balance: balanceText === null ? null : parseCsvAmount(balanceText, decimal),
            category,
            currency: currencyText !== null && CURRENCY_CODE.test(currencyText) ? currencyText.toUpperCase() : null,
            dateText,
            income: signed !== null && signed > 0,
            index,
            label,
        };
        if (signed === null || signed === 0) {
            if (label !== "" || dateText !== "") {
                faulty.push({ ...base, amount: null, fault: "amount" });
            }
            continue;
        }
        const date = parseCsvDate(dateText, options.dateFormat);
        if (date === null) {
            faulty.push({ ...base, amount: Math.abs(signed), fault: "date" });
            continue;
        }
        rows.push({ ...base, amount: Math.abs(signed), at: fileInstant(dateText, date, options) });
    }
    return { faulty, rows };
}

const LONG_DIGIT_RUN = /\p{Nd}{4,}/gu;

/** What leaves the device for a suggestion: card and account numbers never do. */
export const scrubLabel = (raw: string) => raw.replaceAll(LONG_DIGIT_RUN, "").replaceAll(/\s+/g, " ").trim();

const CODE_TAIL = /(?:\s*[#*]\s*\S*|\s+\p{Nd}+)+$/u;
const SMALL_WORD = /^(?:de|del|la|el|los|las|y|of|and|the|do|da)$/u;

/** A readable merchant from bank text, when nothing better names it: "TRADER JOE S #552" reads "Trader Joe S". */
export function tidyLabel(raw: string): string {
    const trimmed = scrubLabel(raw).replace(CODE_TAIL, "").trim() || scrubLabel(raw) || raw.trim();
    if (trimmed !== trimmed.toUpperCase()) {
        return trimmed;
    }
    return trimmed
        .toLowerCase()
        .split(" ")
        .map((word, at) => (at > 0 && SMALL_WORD.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(" ");
}

/** "costco.com" reads "Costco". */
export function domainName(domain: string): string {
    const root = domain.replace(/^www\./, "").split(".")[0] ?? domain;
    return root.charAt(0).toUpperCase() + root.slice(1);
}

export interface LabelGroup {
    /** The category column's text when the file has one, the merchant's otherwise. */
    fromCategory: boolean;
    income: boolean;
    key: string;
    label: string;
    rows: number;
}

export const groupKey = (row: Pick<FileRow, "category" | "label">) =>
    row.category === null
        ? `m:${merchantKey(scrubLabel(row.label)) || merchantKey(row.label)}`
        : `c:${categoryKey(row.category)}`;

export function labelGroups(rows: readonly FileRow[]): LabelGroup[] {
    const groups = new Map<string, LabelGroup & { incomeVotes: number }>();
    for (const row of rows) {
        const key = groupKey(row);
        const group = groups.get(key) ?? {
            fromCategory: row.category !== null,
            income: false,
            incomeVotes: 0,
            key,
            label: row.category ?? row.label,
            rows: 0,
        };
        group.rows += 1;
        group.incomeVotes += row.income ? 1 : -1;
        groups.set(key, group);
    }
    return [...groups.values()]
        .map(({ incomeVotes, ...group }) => ({ ...group, income: incomeVotes > 0 }))
        .toSorted((a, b) => b.rows - a.rows || a.label.localeCompare(b.label));
}

export type FoundBy = "ai" | "entries" | "file" | "none" | "rule";

export interface Resolution {
    categoryId: string | null;
    foundBy: FoundBy;
    /** A cleaner merchant than the bank text, when something on the device or the model knows one. */
    name: string | null;
}

export interface KnownCategory {
    id: string;
    income: boolean;
    name: string;
}

export interface PastEntry {
    categoryId: string | null;
    note: string;
}

export type RuleMatch = (label: string, income: boolean) => string | null;

const byName = (categories: readonly KnownCategory[], name: string, income: boolean | null) => {
    const key = categoryKey(name);
    const named = categories.filter((category) => categoryKey(category.name) === key);
    return (named.find((category) => income === null || category.income === income) ?? named[0])?.id ?? null;
};

/** What the device settles without asking anyone: the file's own category, then your past entries, then a rule. */
export function resolveOnDevice(
    groups: readonly LabelGroup[],
    categories: readonly KnownCategory[],
    past: readonly PastEntry[],
    rule: RuleMatch
): Map<string, Resolution> {
    const history = new Map<string, { counts: Map<string, number>; name: string }>();
    for (const entry of past) {
        if (entry.categoryId === null || entry.note.trim() === "") {
            continue;
        }
        const key = merchantKey(scrubLabel(entry.note));
        const seen = history.get(key) ?? { counts: new Map(), name: entry.note.trim() };
        seen.counts.set(entry.categoryId, (seen.counts.get(entry.categoryId) ?? 0) + 1);
        history.set(key, seen);
    }
    const known = new Set(categories.map((category) => category.id));
    const resolved = new Map<string, Resolution>();
    for (const group of groups) {
        if (group.fromCategory) {
            const id = byName(categories, group.label, group.income);
            resolved.set(group.key, { categoryId: id, foundBy: id === null ? "none" : "file", name: null });
            continue;
        }
        const seen = history.get(group.key.slice(2));
        const usual = seen
            ? [...seen.counts].filter(([id]) => known.has(id)).toSorted((a, b) => b[1] - a[1])[0]?.[0]
            : undefined;
        if (seen && usual !== undefined) {
            resolved.set(group.key, { categoryId: usual, foundBy: "entries", name: seen.name });
            continue;
        }
        const ruled = rule(group.label, group.income);
        resolved.set(group.key, { categoryId: ruled, foundBy: ruled === null ? "none" : "rule", name: null });
    }
    return resolved;
}

export interface Suggestion {
    categoryName: string;
    domain: string | null;
    label: string;
}

/** Folds the model's answers into what the device left open, by the scrubbed label each was asked under. */
export function withSuggestions(
    groups: readonly LabelGroup[],
    resolved: ReadonlyMap<string, Resolution>,
    suggestions: readonly Suggestion[],
    categories: readonly KnownCategory[]
): Map<string, Resolution> {
    const answers = new Map(suggestions.map((suggestion) => [scrubLabel(suggestion.label), suggestion]));
    const next = new Map(resolved);
    for (const group of groups) {
        const current = resolved.get(group.key);
        if (current?.foundBy !== "none") {
            continue;
        }
        const answer = answers.get(scrubLabel(group.label));
        const id = answer ? byName(categories, answer.categoryName, group.income) : null;
        if (answer && id !== null) {
            next.set(group.key, {
                categoryId: id,
                foundBy: "ai",
                name: answer.domain === null ? null : domainName(answer.domain),
            });
        }
    }
    return next;
}

/** The labels worth asking about: unmatched, scrubbed and deduplicated, at most `limit`. */
export function askedLabels(groups: readonly LabelGroup[], resolved: ReadonlyMap<string, Resolution>, limit: number) {
    const labels = new Set<string>();
    for (const group of groups) {
        if (group.fromCategory || resolved.get(group.key)?.foundBy !== "none") {
            continue;
        }
        const label = scrubLabel(group.label);
        if (label !== "") {
            labels.add(label);
        }
    }
    return [...labels].slice(0, limit);
}

export interface ExistingEntry {
    accountId: string | null;
    amount: number;
    at: number;
    currency: string;
    id: string;
    income: boolean;
}

const fingerprint = (entry: { amount: number; at: number; currency: string; income: boolean }, offsetAt: OffsetAt) =>
    `${isoDay(entry.at, offsetAt(entry.at))}|${entry.amount.toFixed(2)}|${entry.currency}|${entry.income ? 1 : 0}`;

/**
 * Same day, amount and currency count as a match. Each entry already in the ledger answers for one row at most, so
 * two identical coffees in the file still find only the one that was logged.
 */
export function matchDuplicates<
    Row extends {
        accountId: string | null;
        amount: number;
        at: number;
        currency: string;
        income: boolean;
        index: number;
    },
>(rows: readonly Row[], existing: readonly ExistingEntry[], offsetAt: OffsetAt): Map<number, ExistingEntry> {
    const pool = new Map<string, ExistingEntry[]>();
    for (const entry of existing) {
        const key = fingerprint(entry, offsetAt);
        pool.set(key, [...(pool.get(key) ?? []), entry]);
    }
    const matched = new Map<number, ExistingEntry>();
    for (const row of rows) {
        const candidates = pool.get(fingerprint(row, offsetAt));
        if (!candidates || candidates.length === 0) {
            continue;
        }
        const at = Math.max(
            0,
            candidates.findIndex((entry) => entry.accountId === row.accountId)
        );
        const [hit] = candidates.splice(at, 1);
        if (hit) {
            matched.set(row.index, hit);
        }
    }
    return matched;
}

export interface StatementCheck {
    end: number;
    start: number;
}

/**
 * A balance column states the account after each row. The earliest row's balance less its own amount is where the
 * statement started, and the latest row's balance is where it ended.
 */
export function statementOf(rows: readonly FileRow[]): StatementCheck | null {
    const stated = rows.filter((row) => row.balance !== null);
    if (stated.length === 0) {
        return null;
    }
    // Banks list newest or oldest first; rows sharing a day keep the file's direction.
    const newestFirst = (stated[0]?.at ?? 0) > (stated.at(-1)?.at ?? 0);
    const order = stated.toSorted((a, b) => a.at - b.at || (newestFirst ? b.index - a.index : a.index - b.index));
    const [first] = order;
    const last = order.at(-1);
    if (first?.balance == null || last?.balance == null) {
        return null;
    }
    const signed = first.income ? first.amount : -first.amount;
    return { end: last.balance, start: first.balance - signed };
}

export const net = (rows: readonly { amount: number; income: boolean }[]) =>
    rows.reduce((sum, row) => sum + (row.income ? row.amount : -row.amount), 0);

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A row that didn't read, put right by hand: a date picked as yyyy-mm-dd, an amount typed with "+" for money in and
 * anything else as money out, since most statement rows are spending.
 */
export function repairRow(
    row: FaultyRow,
    fix: { amount: string; date: string },
    { dateFormat, offsetAt }: ReadOptions
): FileRow | null {
    const day = ISO_DAY.exec(fix.date);
    const read = parseCsvDate(row.dateText, dateFormat);
    let at: number | null = read === null ? null : fileInstant(row.dateText, read, { dateFormat, offsetAt });
    if (day) {
        at = fromWall(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])), offsetAt);
    }
    if (at === null) {
        return null;
    }
    if (row.amount !== null) {
        return { ...row, amount: row.amount, at };
    }
    const text = fix.amount.trim();
    const income = text.startsWith("+");
    const typed = parseCsvAmount(income ? text.slice(1) : text);
    if (typed === null || typed === 0) {
        return null;
    }
    return { ...row, amount: Math.abs(typed), at, income };
}

import { parseCsv, parseCsvAmount, parseCsvDate, parseCsvType } from "@outlayr/money/csv-read";
import type { DecimalSeparator } from "@outlayr/money/csv-read";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { transactionsToCsv } from "@outlayr/money/transaction-csv";
import { desc, eq, isNull } from "drizzle-orm";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { presetForName } from "@/domain/category-presets";
import { splitHeaderAndRows } from "@/domain/import-header";
import type { ColumnMapping } from "@/domain/import-header";

import { Meta } from "./app-meta-core";
import type { MetaName } from "./app-meta-registry";
import { capitalizeCategoryName, ensureCategoryByName, formatCategoryName } from "./categories-core";
import { NOTHING_UNDONE, undoRecordedImport } from "./money-manager-import-core";
import { transactionsRepo } from "./transactions-core";

const CsvTransferOperation = Schema.Literals(["export", "import", "undo"]);

export class CsvTransferError extends Schema.TaggedError<CsvTransferError>()("CsvTransferError", {
    cause: Schema.Defect(),
    operation: CsvTransferOperation,
}) {
    override get message(): string {
        return `CSV ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof CsvTransferOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new CsvTransferError({ cause, operation }), try: run });

export const exportTransactionsCsv = Effect.fn("CsvTransfer.exportTransactionsCsv")(function* exportTransactionsCsv(
    db: Database
) {
    const rows = yield* attempt("export", () =>
        db
            .select({
                amount: transactions.amount,
                categoryName: categories.name,
                currency: transactions.currency,
                date: transactions.date,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
                income: transactions.income,
                note: transactions.note,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(isNull(transactions.deletedAt))
            .orderBy(desc(transactions.date))
    );

    const ledgerCurrency = yield* Meta.get(db, "currency");
    return transactionsToCsv(rows, ledgerCurrency);
});

export function exportFileName(now: Date): string {
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `outlayr-${year}-${month}-${day}.csv`;
}

export interface ImportEntry {
    amount: number;
    categoryId: string;
    /** Null adopts the ledger's code at write time. */
    currency: string | null;
    date: Date;
    exchangeRate?: number | null;
    exchangeRateType?: EntryRateType | null;
    imageColor?: string | null;
    /** Attached at commit time from the merchant's cached logo, if any. */
    imageUri?: string | null;
    income: boolean;
    note: string;
    row: number;
}

export type SkipReason = "category" | "date" | "amount" | "rate";

export interface SkippedRow {
    reason: SkipReason;
    /** 1-based over the data rows, so it names what the user sees in the file. */
    row: number;
}

export interface PlannedCategory {
    id: string;
    income: boolean;
    name: string;
}

export interface ImportPlan {
    earliest: Date | null;
    entries: ImportEntry[];
    latest: Date | null;
    newCategories: PlannedCategory[];
    skipped: SkippedRow[];
}

const PLANNED_ID_PREFIX = "planned:";

/** Folded, so `"Food"` and `"food "` are linked once rather than separately. */
export function categoryKey(value: string): string {
    return capitalizeCategoryName(value).toLowerCase();
}

export interface ParsedImportFile {
    /** Null when the first line already carries data. */
    header: string[] | null;
    rows: string[][];
    /** Widest row, since a CSV may be ragged. */
    width: number;
}

/** A date, an amount and a category are the least this can build a row from. */
const MINIMUM_COLUMNS = 3;

const NOTION_LINK = /\s\((?:https:\/\/(?:www\.|app\.)?notion\.(?:so|com|site)\/[^\s)]*|[^\s()]+\.md)\)/g;

/**
 * Null means the file cannot be used at all, which the caller reports once
 * rather than letting the user assign columns to something unusable.
 */
export function parseImportFile(text: string): ParsedImportFile | null {
    const lines = parseCsv(text).map((line) => line.map((cell) => cell.replaceAll(NOTION_LINK, "")));
    if (lines.length === 0) {
        return null;
    }

    const { header, rows } = splitHeaderAndRows(lines);
    if (rows.length === 0) {
        return null;
    }

    const width = Math.max(...rows.map((row) => row.length));
    if (width < MINIMUM_COLUMNS) {
        return null;
    }

    return { header, rows, width };
}

/** First-appearance spelling of every distinct value in the category column. */
export function uniqueCategoryValues(rows: readonly (readonly string[])[], index: number): string[] {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const row of rows) {
        const raw = row[index]?.trim();
        if (raw == null || raw === "") {
            continue;
        }
        const key = categoryKey(raw);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        values.push(raw);
    }
    return values;
}

const CURRENCY_CODE = /^[A-Za-z]{3}$/;

function entryRateType(value: string): EntryRateType | null {
    const normalized = value.trim();
    return ENTRY_RATE_TYPES.find((candidate) => candidate === normalized) ?? null;
}

function readRateMetadata(
    row: readonly string[],
    mapping: ColumnMapping,
    decimal: DecimalSeparator
): Pick<ImportEntry, "exchangeRate" | "exchangeRateType"> | "rate" {
    const typeCell = mapping.exchangeRateType == null ? "" : (row[mapping.exchangeRateType] ?? "").trim();
    const rateCell = mapping.exchangeRate == null ? "" : (row[mapping.exchangeRate] ?? "").trim();

    if (typeCell === "" && rateCell === "") {
        return { exchangeRate: null, exchangeRateType: null };
    }
    const exchangeRateType = entryRateType(typeCell);
    if (exchangeRateType == null) {
        return "rate";
    }
    if (rateCell === "") {
        return { exchangeRate: null, exchangeRateType };
    }
    const exchangeRate = parseCsvAmount(rateCell, decimal);
    if (exchangeRate == null || exchangeRate <= 0) {
        return "rate";
    }
    return { exchangeRate, exchangeRateType };
}

type ReadRow = { entry: Omit<ImportEntry, "row">; skipped: null } | { entry: null; skipped: SkipReason };

function skip(reason: SkipReason): ReadRow {
    return { entry: null, skipped: reason };
}

function readImportRow(
    row: readonly string[],
    mapping: ColumnMapping,
    dateFormat: string,
    decimal: DecimalSeparator,
    links: ReadonlyMap<string, string>,
    categoryIncome: ReadonlyMap<string, boolean>
): ReadRow {
    const categoryId = links.get(categoryKey(row[mapping.category] ?? ""));
    if (categoryId == null) {
        return skip("category");
    }

    const date = parseCsvDate(row[mapping.date] ?? "", dateFormat);
    if (date == null) {
        return skip("date");
    }

    const amount = parseCsvAmount(row[mapping.amount] ?? "", decimal);
    if (amount == null) {
        return skip("amount");
    }
    const currencyCell = mapping.currency == null ? "" : (row[mapping.currency] ?? "").trim();
    const currency = CURRENCY_CODE.test(currencyCell) ? currencyCell.toUpperCase() : null;
    const rateMetadata = readRateMetadata(row, mapping, decimal);
    if (rateMetadata === "rate") {
        return skip("rate");
    }
    if (
        rateMetadata.exchangeRateType != null &&
        (currency === "USD" || (rateMetadata.exchangeRateType === "eur_reference" && currency !== "VES"))
    ) {
        return skip("rate");
    }

    const declaredType = mapping.type == null ? null : parseCsvType(row[mapping.type] ?? "");

    return {
        entry: {
            amount: Math.abs(amount),
            categoryId,
            currency,
            date,
            ...rateMetadata,
            income: declaredType ?? categoryIncome.get(categoryId) ?? false,
            note: mapping.note == null ? "" : (row[mapping.note] ?? "").trim(),
        },
        skipped: null,
    };
}

function planCategories(
    rows: readonly (readonly string[])[],
    mapping: ColumnMapping,
    links: ReadonlyMap<string, string>,
    createMissingCategories: boolean
) {
    const balances = new Map<string, number>();
    const names = new Map<string, string>();
    const idByKey = new Map<string, string>();
    const labelsAreDescriptions = mapping.category === mapping.note;
    if (labelsAreDescriptions || !createMissingCategories) {
        return { categories: [], idByKey };
    }
    for (const row of rows) {
        const raw = row[mapping.category] ?? "";
        const key = categoryKey(raw);
        if (key === "" || links.has(key)) {
            continue;
        }
        const folded = capitalizeCategoryName(raw);
        if (!names.has(folded)) {
            names.set(folded, formatCategoryName(raw));
        }
        const declared = mapping.type == null ? null : parseCsvType(row[mapping.type] ?? "");
        let balance = balances.get(folded) ?? 0;
        if (declared != null) {
            balance += declared ? 1 : -1;
        }
        balances.set(folded, balance);
        idByKey.set(key, `${PLANNED_ID_PREFIX}${folded}`);
    }
    const plannedCategories: PlannedCategory[] = [...balances].map(([folded, balance]) => ({
        id: `${PLANNED_ID_PREFIX}${folded}`,
        income: balance > 0,
        name: names.get(folded) ?? folded,
    }));
    return { categories: plannedCategories, idByKey };
}

/**
 * A row that cannot be read is dropped with its reason rather than defaulted: a guessed
 * date or category is indistinguishable from a real one once it is in the ledger.
 */
export function buildImportPlan(
    rows: readonly (readonly string[])[],
    mapping: ColumnMapping,
    dateFormat: string,
    decimal: DecimalSeparator,
    links: ReadonlyMap<string, string>,
    categoryIncome: ReadonlyMap<string, boolean>,
    createMissingCategories: boolean
): ImportPlan {
    const entries: ImportEntry[] = [];
    const skipped: SkippedRow[] = [];

    const planned = planCategories(rows, mapping, links, createMissingCategories);
    const allLinks = new Map([...links, ...planned.idByKey]);
    const allIncome = new Map(categoryIncome);
    for (const category of planned.categories) {
        allIncome.set(category.id, category.income);
    }

    for (const [index, row] of rows.entries()) {
        const read = readImportRow(row, mapping, dateFormat, decimal, allLinks, allIncome);
        if (read.entry === null) {
            skipped.push({ reason: read.skipped, row: index + 1 });
            continue;
        }

        entries.push({ ...read.entry, row: index + 1 });
    }

    const used = new Set(entries.map((entry) => entry.categoryId));
    return {
        ...dateRange(entries),
        entries,
        newCategories: planned.categories.filter((category) => used.has(category.id)),
        skipped,
    };
}

function dateRange(entries: readonly ImportEntry[]): Pick<ImportPlan, "earliest" | "latest"> {
    let earliest: Date | null = null;
    let latest: Date | null = null;
    for (const { date } of entries) {
        if (earliest == null || date < earliest) {
            earliest = date;
        }
        if (latest == null || date > latest) {
            latest = date;
        }
    }
    return { earliest, latest };
}

export type CategoryOverride = { kind: "existing"; categoryId: string } | { kind: "skip" };

export function applyCategoryOverrides(plan: ImportPlan, overrides: ReadonlyMap<string, CategoryOverride>): ImportPlan {
    if (overrides.size === 0) {
        return plan;
    }
    const entries: ImportEntry[] = [];
    const skipped = [...plan.skipped];
    for (const entry of plan.entries) {
        const override = overrides.get(entry.categoryId);
        if (override === undefined) {
            entries.push(entry);
        } else if (override.kind === "existing") {
            entries.push({ ...entry, categoryId: override.categoryId });
        } else {
            skipped.push({ reason: "category", row: entry.row });
        }
    }
    const used = new Set(entries.map((entry) => entry.categoryId));
    return {
        ...dateRange(entries),
        entries,
        newCategories: plan.newCategories.filter((category) => used.has(category.id)),
        skipped: skipped.sort((a, b) => a.row - b.row),
    };
}

/**
 * All or nothing: after a half-applied import the user cannot tell which rows landed,
 * and re-running it duplicates whatever did.
 */
const createEntry = (db: Database, entry: ImportEntry) =>
    transactionsRepo
        .create(
            db,
            {
                amount: entry.amount,
                categoryId: entry.categoryId,
                currency: entry.currency,
                date: entry.date,
                details: null,
                exchangeRate: entry.exchangeRate,
                exchangeRateType: entry.exchangeRateType,
                imageColor: entry.imageColor ?? null,
                imageUri: entry.imageUri ?? null,
                income: entry.income,
                note: entry.note,
            },
            // Imported rows are never looked up in the background: the import
            // said what left the device, and that was decided at import time.
            { logoCandidate: false }
        )
        .pipe(Effect.mapError((error) => new CsvTransferError({ cause: error.cause ?? error, operation: "import" })));

const createPlannedCategories = Effect.fn("CsvTransfer.createPlannedCategories")(function* createPlannedCategories(
    db: Database,
    plan: ImportPlan
) {
    const used = new Set(plan.entries.map((entry) => entry.categoryId));
    const existing = yield* attempt("import", () => db.select({ id: categories.id }).from(categories));
    const known = new Set(existing.map((row) => row.id));
    const ids = new Map<string, string>();
    const created = new Set<string>();
    for (const category of plan.newCategories) {
        if (!used.has(category.id)) {
            continue;
        }
        const style = presetForName(category.name);
        const id = yield* ensureCategoryByName(db, category.name, category.income, style.icon, style.color).pipe(
            Effect.mapError((cause) => new CsvTransferError({ cause, operation: "import" }))
        );
        ids.set(category.id, id);
        if (!known.has(id)) {
            created.add(id);
        }
    }
    return { created: [...created], ids };
});

export type FileImportKind = "csv" | "pdf";

const FILE_IMPORT_META = { csv: "csvImport", pdf: "pdfImport" } as const satisfies Record<FileImportKind, MetaName>;

export const applyImport = Effect.fn("CsvTransfer.applyImport")(function* applyImport(
    db: Database,
    plan: ImportPlan,
    kind: FileImportKind = "csv"
) {
    if (plan.entries.length === 0) {
        return 0;
    }

    yield* transaction(
        db,
        Effect.gen(function* write() {
            const { created, ids } = yield* createPlannedCategories(db, plan);
            const transactionIds: string[] = [];
            for (const entry of plan.entries) {
                // Each create reads before it inserts on the one connection the transaction holds, so running them
                // together interleaves those reads and writes.
                const id = yield* createEntry(db, {
                    ...entry,
                    categoryId: ids.get(entry.categoryId) ?? entry.categoryId,
                });
                transactionIds.push(id);
            }
            const importedAt = yield* Clock.currentTimeMillis;
            const record = { categoryIds: created, importedAt, transactionIds };
            yield* Meta.set(db, FILE_IMPORT_META[kind], record).pipe(
                Effect.mapError((cause) => new CsvTransferError({ cause, operation: "import" }))
            );
        }),
        (cause) => new CsvTransferError({ cause, operation: "import" })
    );

    return plan.entries.length;
});

export const lastFileImport = Effect.fn("CsvTransfer.lastFileImport")(function* lastFileImport(
    db: Database,
    kind: FileImportKind = "csv"
) {
    return yield* Meta.get(db, FILE_IMPORT_META[kind]).pipe(
        Effect.mapError((cause) => new CsvTransferError({ cause, operation: "undo" }))
    );
});

export const undoFileImport = Effect.fn("CsvTransfer.undoFileImport")(function* undoFileImport(
    db: Database,
    kind: FileImportKind = "csv"
) {
    const record = yield* lastFileImport(db, kind);
    if (record == null) {
        return NOTHING_UNDONE;
    }
    return yield* undoRecordedImport(
        db,
        { ...record, accountIds: [], budgetIds: [], transferIds: [] },
        FILE_IMPORT_META[kind]
    ).pipe(Effect.mapError((cause) => new CsvTransferError({ cause, operation: "undo" })));
});

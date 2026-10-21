import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { desc, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { parseCsv } from "@/domain/csv";
import { DEFAULT_CURRENCY } from "@/domain/money";
import { parseCsvAmount, parseCsvDate, parseCsvType, transactionsToCsv } from "@/domain/transaction-csv";
import type { DecimalSeparator } from "@/domain/transaction-csv";

import { getMeta, META_KEYS } from "./app-meta-core";
import { transactionsRepo } from "./transactions-core";

export async function exportTransactionsCsv(db: Database): Promise<string> {
    const rows = await db
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
        .orderBy(desc(transactions.date));

    const ledgerCurrency = (await getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    return transactionsToCsv(rows, ledgerCurrency);
}

export function exportFileName(now: Date): string {
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `outlayr-${year}-${month}-${day}.csv`;
}

/**
 * Any field may be unresolved, where `ColumnMapping` requires the three the importer
 * cannot run without.
 */
export interface ColumnMappingGuess {
    amount: number | null;
    category: number | null;
    currency: number | null;
    date: number | null;
    exchangeRate: number | null;
    exchangeRateType: number | null;
    note: number | null;
    type: number | null;
}

/** Which CSV column feeds each field. `null` means the file carries none. */
export interface ColumnMapping {
    amount: number;
    category: number;
    currency: number | null;
    date: number;
    exchangeRate: number | null;
    exchangeRateType: number | null;
    /** Optional: an unmapped note falls back to the category's name on write. */
    note: number | null;
    type: number | null;
}

const HEADER_HINTS = {
    amount: ["amount", "value", "total", "sum", "debit"],
    category: ["category", "categories", "tag"],
    currency: ["currency", "code", "ccy"],
    date: ["date", "time", "posted", "when"],
    exchangeRate: ["exchange rate", "rate"],
    exchangeRateType: ["exchange rate type", "rate type"],
    note: ["note", "description", "memo", "payee", "merchant", "name", "details"],
    type: ["type", "direction", "kind"],
} satisfies Record<keyof ColumnMapping, readonly string[]>;

// Match specific overlapping labels before their general substring forms;
// unlike object keys, this order is not changed by property-sorting formatters.
const HEADER_MATCH_ORDER: readonly (keyof ColumnMapping)[] = [
    "exchangeRateType",
    "exchangeRate",
    "amount",
    "category",
    "currency",
    "date",
    "note",
    "type",
];

/**
 * A file this app exported maps itself. Fields it cannot place stay `null` for the user
 * to assign, which is why `date` and `amount` widen here but not in {@link ColumnMapping}.
 */
export function guessMapping(header: readonly string[]): ColumnMappingGuess {
    const normalized = header.map((cell) => cell.trim().toLowerCase());
    const taken = new Set<number>();
    const guess: ColumnMappingGuess = {
        amount: null,
        category: null,
        currency: null,
        date: null,
        exchangeRate: null,
        exchangeRateType: null,
        note: null,
        type: null,
    };

    for (const field of HEADER_MATCH_ORDER) {
        const index = normalized.findIndex(
            (cell, at) => !taken.has(at) && HEADER_HINTS[field].some((hint) => cell.includes(hint))
        );
        if (index !== -1) {
            guess[field] = index;
            taken.add(index);
        }
    }
    return guess;
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
}

export type SkipReason = "category" | "date" | "amount" | "rate";

export interface SkippedRow {
    reason: SkipReason;
    /** 1-based over the data rows, so it names what the user sees in the file. */
    row: number;
}

export interface ImportPlan {
    earliest: Date | null;
    entries: ImportEntry[];
    latest: Date | null;
    skipped: SkippedRow[];
}

/** Folded, so `"Food"` and `"food "` are linked once rather than separately. */
export function categoryKey(value: string): string {
    return value.trim().toLowerCase();
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

const ANY_DIGIT = /\d/;

/**
 * A first line with no digit in it is a header, because a data row always carries at
 * least a date or an amount.
 */
export interface HeaderAndRows {
    /** Null when the first line was data, not a header. */
    header: string[] | null;
    rows: string[][];
}

export function splitHeaderAndRows(lines: string[][]): HeaderAndRows {
    const first = lines[0] ?? [];
    const looksLikeHeader = !ANY_DIGIT.test(first.join(""));
    const rows = looksLikeHeader ? lines.slice(1) : lines;
    return { header: looksLikeHeader ? first : null, rows };
}

/**
 * Null means the file cannot be used at all, which the caller reports once
 * rather than letting the user assign columns to something unusable.
 */
export function parseImportFile(text: string): ParsedImportFile | null {
    const lines = parseCsv(text);
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

type ReadRow = { entry: ImportEntry; skipped: null } | { entry: null; skipped: SkipReason };

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
    categoryIncome: ReadonlyMap<string, boolean>
): ImportPlan {
    const entries: ImportEntry[] = [];
    const skipped: SkippedRow[] = [];
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const [index, row] of rows.entries()) {
        const read = readImportRow(row, mapping, dateFormat, decimal, links, categoryIncome);
        if (read.entry === null) {
            skipped.push({ reason: read.skipped, row: index + 1 });
            continue;
        }

        const { entry } = read;
        entries.push(entry);

        if (earliest == null || entry.date < earliest) {
            earliest = entry.date;
        }
        if (latest == null || entry.date > latest) {
            latest = entry.date;
        }
    }

    return { earliest, entries, latest, skipped };
}

/**
 * All or nothing: after a half-applied import the user cannot tell which rows landed,
 * and re-running it duplicates whatever did.
 */
export async function applyImport(db: Database, plan: ImportPlan): Promise<number> {
    if (plan.entries.length === 0) {
        return 0;
    }

    await withTransaction(db, async () => {
        for (const entry of plan.entries) {
            // oxlint-disable-next-line no-await-in-loop -- each create reads before it inserts on the one connection withTransaction holds, so running them together interleaves those reads and writes
            await transactionsRepo.create(
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
            );
        }
    });

    return plan.entries.length;
}

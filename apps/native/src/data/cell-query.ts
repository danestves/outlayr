import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { and, count, eq, gte, isNotNull, isNull, lte, sql, sum } from "drizzle-orm";

import type { SpendDb } from "@/data/budget-spent";
import { transactions } from "@/db/schema";

// The same key `utcDateString` derives in JS, so SQL and the Log's day sections look rates up on the same day.
export const UTC_DAY = sql<string>`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch')`;

// Where a row is PLOTTED (local days, like goals and `useNow`), never where it is VALUED: `dateKey` stays the rate
// lookup day. Every read of an account's cells groups by it, since each cell rounds on its own when valued and two
// reads splitting a UTC day differently land a cent apart.
export const LOCAL_DAY = sql<string>`strftime('%Y-%m-%d', ${transactions.date} / 1000, 'unixepoch', 'localtime')`;

// Any query selecting these must group by `currency`, `income` and {@link UTC_DAY}: conversion needs one currency and
// one day's rate.
const CELL_COLUMNS = {
    currency: transactions.currency,
    dateKey: UTC_DAY,
    income: transactions.income,
    rateNeeded: sum(
        sql<number>`CASE WHEN ${transactions.exchangeRateType} = 'custom' AND ${transactions.exchangeRate} IS NULL AND ${transactions.amountUsd} IS NULL THEN ${transactions.amount} ELSE 0 END`
    ),
    rateNeededRows: sql<number>`SUM(CASE WHEN ${transactions.exchangeRateType} = 'custom' AND ${transactions.exchangeRate} IS NULL AND ${transactions.amountUsd} IS NULL THEN 1 ELSE 0 END)`,
    rows: count(),
    total: sum(transactions.amount),
    totalUsd: sum(transactions.amountUsd),
    // The part of `total` no rate applies to: a row with no frozen USD adds nothing to `totalUsd`.
    unconverted: sum(sql<number>`CASE WHEN ${transactions.amountUsd} IS NULL THEN ${transactions.amount} ELSE 0 END`),
    unconvertedRows: sql<number>`SUM(CASE WHEN ${transactions.amountUsd} IS NULL THEN 1 ELSE 0 END)`,
} as const;

export interface CellRow {
    currency: string | null;
    dateKey: string;
    income: boolean;
    rateNeeded?: string | number | null;
    rateNeededRows?: string | number | null;
    rows: number;
    // SQLite hands an aggregate back as a string through drizzle when the column
    // is real, and as a number when it is integer.
    total: string | number | null;
    totalUsd: string | number | null;
    unconverted: string | number | null;
    unconvertedRows: string | number | null;
}

export function toCurrencyCell(row: CellRow): CurrencyCell {
    return {
        amount: Number(row.total ?? 0),
        amountUsd: Number(row.totalUsd ?? 0),
        count: row.rows,
        currencyCode: row.currency,
        dateKey: row.dateKey,
        income: row.income,
        rateNeededAmount: Number(row.rateNeeded ?? 0),
        rateNeededCount: Number(row.rateNeededRows ?? 0),
        unconvertedAmount: Number(row.unconverted ?? 0),
        unconvertedCount: Number(row.unconvertedRows ?? 0),
    };
}

export function toCurrencyCells(rows: readonly CellRow[]): CurrencyCell[] {
    return rows.map(toCurrencyCell);
}

// Aggregated in SQL: the Log's `"all"` period has no lower bound, so a plain select would fetch every row each re-run.
export function logCellQuery(db: SpendDb, start: Date | null, now: Date) {
    return db
        .select(CELL_COLUMNS)
        .from(transactions)
        .where(
            and(
                isNull(transactions.deletedAt),
                start ? gte(transactions.date, start) : undefined,
                lte(transactions.date, now)
            )
        )
        .groupBy(transactions.currency, transactions.income, UTC_DAY);
}

export function settledAccountCellQuery(db: SpendDb, accountId: string, now: Date) {
    return db
        .select({ ...CELL_COLUMNS, plotDay: LOCAL_DAY })
        .from(transactions)
        .where(and(isNull(transactions.deletedAt), eq(transactions.accountId, accountId), lte(transactions.date, now)))
        .groupBy(transactions.currency, transactions.income, UTC_DAY, LOCAL_DAY);
}

// Bounded before grouping: a cell carries only a day key, so an entry scheduled for 23:00 today is indistinguishable
// from one made at 09:00.
export function settledAccountsCellQuery(db: SpendDb, now: Date) {
    return db
        .select({ accountId: transactions.accountId, ...CELL_COLUMNS, plotDay: LOCAL_DAY })
        .from(transactions)
        .where(and(isNull(transactions.deletedAt), isNotNull(transactions.accountId), lte(transactions.date, now)))
        .groupBy(transactions.accountId, transactions.currency, transactions.income, UTC_DAY, LOCAL_DAY);
}

// Unbounded by date, like Swift's `Category.allTransactions`, which counts future-dated logs too.
export function categoryCellQuery(db: SpendDb) {
    return db
        .select({ categoryId: transactions.categoryId, ...CELL_COLUMNS })
        .from(transactions)
        .where(isNull(transactions.deletedAt))
        .groupBy(transactions.categoryId, transactions.currency, transactions.income, UTC_DAY);
}

import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { and, count, eq, isNull, lte, sql, sum } from "drizzle-orm";

import type { SpendDb } from "@/data/budget-spent";
import { accounts, installmentPlans, outsideMoves, outsidePayments, transfers } from "@/db/schema";

import type { CellRow } from "./cell-query";

const TRANSFER_UTC_DAY = sql<string>`strftime('%Y-%m-%d', ${transfers.date} / 1000, 'unixepoch')`;

/** Where a transfer leg is PLOTTED, never where it is valued (see `LOCAL_DAY`). */
const TRANSFER_LOCAL_DAY = sql<string>`strftime('%Y-%m-%d', ${transfers.date} / 1000, 'unixepoch', 'localtime')`;

/**
 * No `income` column: a transfer row has no direction of its own, so {@link toTransferCell}
 * stamps it from the side the row is read from.
 */
const OUTBOUND_COLUMNS = {
    currency: transfers.fromCurrency,
    dateKey: TRANSFER_UTC_DAY,
    rows: count(),
    total: sum(transfers.fromAmount),
    totalUsd: sum(transfers.fromAmountUsd),
    unconverted: sum(sql<number>`CASE WHEN ${transfers.fromAmountUsd} IS NULL THEN ${transfers.fromAmount} ELSE 0 END`),
    unconvertedRows: sql<number>`SUM(CASE WHEN ${transfers.fromAmountUsd} IS NULL THEN 1 ELSE 0 END)`,
} as const;

const INBOUND_COLUMNS = {
    currency: transfers.toCurrency,
    dateKey: TRANSFER_UTC_DAY,
    rows: count(),
    total: sum(transfers.toAmount),
    totalUsd: sum(transfers.toAmountUsd),
    unconverted: sum(sql<number>`CASE WHEN ${transfers.toAmountUsd} IS NULL THEN ${transfers.toAmount} ELSE 0 END`),
    unconvertedRows: sql<number>`SUM(CASE WHEN ${transfers.toAmountUsd} IS NULL THEN 1 ELSE 0 END)`,
} as const;

export function settledTransferOutboundQuery(db: SpendDb, accountId: string, now: Date) {
    return db
        .select({ ...OUTBOUND_COLUMNS, plotDay: TRANSFER_LOCAL_DAY })
        .from(transfers)
        .where(and(isNull(transfers.deletedAt), eq(transfers.fromAccountId, accountId), lte(transfers.date, now)))
        .groupBy(transfers.fromCurrency, TRANSFER_UTC_DAY, TRANSFER_LOCAL_DAY);
}

export function settledTransferInboundQuery(db: SpendDb, accountId: string, now: Date) {
    return db
        .select({ ...INBOUND_COLUMNS, plotDay: TRANSFER_LOCAL_DAY })
        .from(transfers)
        .where(and(isNull(transfers.deletedAt), eq(transfers.toAccountId, accountId), lte(transfers.date, now)))
        .groupBy(transfers.toCurrency, TRANSFER_UTC_DAY, TRANSFER_LOCAL_DAY);
}

export function settledTransfersOutboundQuery(db: SpendDb, now: Date) {
    return db
        .select({ accountId: transfers.fromAccountId, ...OUTBOUND_COLUMNS, plotDay: TRANSFER_LOCAL_DAY })
        .from(transfers)
        .where(and(isNull(transfers.deletedAt), lte(transfers.date, now)))
        .groupBy(transfers.fromAccountId, transfers.fromCurrency, TRANSFER_UTC_DAY, TRANSFER_LOCAL_DAY);
}

export function settledTransfersInboundQuery(db: SpendDb, now: Date) {
    return db
        .select({ accountId: transfers.toAccountId, ...INBOUND_COLUMNS, plotDay: TRANSFER_LOCAL_DAY })
        .from(transfers)
        .where(and(isNull(transfers.deletedAt), lte(transfers.date, now)))
        .groupBy(transfers.toAccountId, transfers.toCurrency, TRANSFER_UTC_DAY, TRANSFER_LOCAL_DAY);
}

const OUTSIDE_UTC_DAY = sql<string>`strftime('%Y-%m-%d', ${outsidePayments.date} / 1000, 'unixepoch')`;
const OUTSIDE_LOCAL_DAY = sql<string>`strftime('%Y-%m-%d', ${outsidePayments.date} / 1000, 'unixepoch', 'localtime')`;

/**
 * An order's outside payments arrive on its liability account like a transfer's
 * inbound leg, from nowhere: read them as `toTransferCell(row, true)`. The plan
 * gives the account, and the account the currency its amounts are in.
 */
const OUTSIDE_COLUMNS = {
    currency: accounts.currency,
    dateKey: OUTSIDE_UTC_DAY,
    rows: count(),
    total: sum(outsidePayments.amount),
    totalUsd: sum(outsidePayments.amountUsd),
    unconverted: sum(
        sql<number>`CASE WHEN ${outsidePayments.amountUsd} IS NULL THEN ${outsidePayments.amount} ELSE 0 END`
    ),
    unconvertedRows: sql<number>`SUM(CASE WHEN ${outsidePayments.amountUsd} IS NULL THEN 1 ELSE 0 END)`,
} as const;

function settledOutside(now: Date) {
    return and(isNull(outsidePayments.deletedAt), isNull(installmentPlans.deletedAt), lte(outsidePayments.date, now));
}

const MOVE_UTC_DAY = sql<string>`strftime('%Y-%m-%d', ${outsideMoves.date} / 1000, 'unixepoch')`;
const MOVE_LOCAL_DAY = sql<string>`strftime('%Y-%m-%d', ${outsideMoves.date} / 1000, 'unixepoch', 'localtime')`;

const MOVE_COLUMNS = {
    currency: accounts.currency,
    dateKey: MOVE_UTC_DAY,
    rows: count(),
    total: sum(outsideMoves.amount),
    totalUsd: sum(outsideMoves.amountUsd),
    unconverted: sum(sql<number>`CASE WHEN ${outsideMoves.amountUsd} IS NULL THEN ${outsideMoves.amount} ELSE 0 END`),
    unconvertedRows: sql<number>`SUM(CASE WHEN ${outsideMoves.amountUsd} IS NULL THEN 1 ELSE 0 END)`,
} as const;

function settledMoves(now: Date) {
    return and(isNull(outsideMoves.deletedAt), lte(outsideMoves.date, now));
}

export function settledOutsidePaymentQuery(db: SpendDb, accountId: string, now: Date) {
    return db
        .select({ ...OUTSIDE_COLUMNS, plotDay: OUTSIDE_LOCAL_DAY })
        .from(outsidePayments)
        .innerJoin(installmentPlans, eq(installmentPlans.id, outsidePayments.planId))
        .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
        .where(and(settledOutside(now), eq(installmentPlans.accountId, accountId)))
        .groupBy(accounts.currency, OUTSIDE_UTC_DAY, OUTSIDE_LOCAL_DAY);
}

export function settledOutsidePaymentsQuery(db: SpendDb, now: Date) {
    return db
        .select({ accountId: installmentPlans.accountId, ...OUTSIDE_COLUMNS, plotDay: OUTSIDE_LOCAL_DAY })
        .from(outsidePayments)
        .innerJoin(installmentPlans, eq(installmentPlans.id, outsidePayments.planId))
        .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
        .where(settledOutside(now))
        .groupBy(installmentPlans.accountId, accounts.currency, OUTSIDE_UTC_DAY, OUTSIDE_LOCAL_DAY);
}

export function settledOutsideMoveQuery(db: SpendDb, accountId: string, now: Date) {
    return db
        .select({ ...MOVE_COLUMNS, plotDay: MOVE_LOCAL_DAY })
        .from(outsideMoves)
        .innerJoin(accounts, eq(accounts.id, outsideMoves.accountId))
        .where(and(settledMoves(now), eq(outsideMoves.accountId, accountId)))
        .groupBy(accounts.currency, MOVE_UTC_DAY, MOVE_LOCAL_DAY);
}

export function settledOutsideMovesQuery(db: SpendDb, now: Date) {
    return db
        .select({ accountId: outsideMoves.accountId, ...MOVE_COLUMNS, plotDay: MOVE_LOCAL_DAY })
        .from(outsideMoves)
        .innerJoin(accounts, eq(accounts.id, outsideMoves.accountId))
        .where(settledMoves(now))
        .groupBy(outsideMoves.accountId, accounts.currency, MOVE_UTC_DAY, MOVE_LOCAL_DAY);
}

export function toTransferCell(row: Omit<CellRow, "income">, income: boolean): CurrencyCell {
    return {
        amount: Number(row.total ?? 0),
        amountUsd: Number(row.totalUsd ?? 0),
        count: row.rows,
        currencyCode: row.currency,
        dateKey: row.dateKey,
        income,
        rateNeededAmount: Number(row.rateNeeded ?? 0),
        rateNeededCount: Number(row.rateNeededRows ?? 0),
        unconvertedAmount: Number(row.unconverted ?? 0),
        unconvertedCount: Number(row.unconvertedRows ?? 0),
    };
}

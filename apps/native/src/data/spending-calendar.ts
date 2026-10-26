import { addDays, startOfDay } from "@outlayr/money/calendar";
import { and, eq, gte, isNull, lte, sum } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { spendingCalendarEntries } from "@/domain/spending-calendar";
import type { SpendingCalendarEntry, SpendingCalendarRow } from "@/domain/spending-calendar";

import type { SpendDb } from "./budget-spent";
import { LOCAL_DAY, UTC_DAY } from "./cell-query";
import { useLiveQuery } from "./live-query";
import { useValuation } from "./use-valuation";

const SPENDING_CALENDAR_DAYS = 182;

export function spendingCalendarStart(now: Date): Date {
    return addDays(startOfDay(now), -(SPENDING_CALENDAR_DAYS - 1));
}

export function spendingCalendarQuery(db: SpendDb, now: Date) {
    return db
        .select({
            amount: sum(transactions.amount),
            amountUsd: sum(transactions.amountUsd),
            currency: transactions.currency,
            dateKey: UTC_DAY,
            exchangeRate: transactions.exchangeRate,
            exchangeRateType: transactions.exchangeRateType,
            income: transactions.income,
            plotKey: LOCAL_DAY,
        })
        .from(transactions)
        .where(
            and(
                eq(transactions.income, false),
                isNull(transactions.deletedAt),
                gte(transactions.date, spendingCalendarStart(now)),
                lte(transactions.date, now)
            )
        )
        .groupBy(
            transactions.currency,
            transactions.income,
            LOCAL_DAY,
            UTC_DAY,
            transactions.exchangeRate,
            transactions.exchangeRateType,
            isNull(transactions.amountUsd)
        );
}

function normalizeRows(
    rows: Awaited<ReturnType<ReturnType<typeof spendingCalendarQuery>["execute"]>>
): SpendingCalendarRow[] {
    return rows.map((row) => ({
        amount: Number(row.amount ?? 0),
        amountUsd: row.amountUsd === null ? null : Number(row.amountUsd),
        currency: row.currency,
        exchangeRate: row.exchangeRate,
        exchangeRateType: row.exchangeRateType,
        income: row.income,
        plotKey: row.plotKey,
        valuationDate: new Date(`${row.dateKey}T00:00:00.000Z`),
    }));
}

export function useSpendingCalendar(db: Database, nowMs: number): SpendingCalendarEntry[] {
    const rows = useLiveQuery(transactions, () => spendingCalendarQuery(db, new Date(nowMs)), [nowMs], nowMs);
    const valuation = useValuation(db);

    return spendingCalendarEntries(normalizeRows(rows), valuation, new Date(nowMs));
}

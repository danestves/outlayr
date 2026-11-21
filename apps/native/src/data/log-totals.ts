import { firstOfMonth, startOfDay, startOfWeek, startOfYear } from "@outlayr/money/calendar";
import { cellFigures } from "@outlayr/money/currency-totals";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import { and, asc, gte, isNull, lte } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import type { LogFigures } from "@/domain/log-measure";
import { previousPeriodWindow } from "@/domain/period-window";

import { logCellQuery, toCurrencyCells } from "./cell-query";
import type { CellRow } from "./cell-query";
import { kept } from "./deletion-plan";
import { NO_READ, useLiveQuery } from "./live-query";
import { usePendingDeletes } from "./use-deferred-delete";

export type LogPeriod = "day" | "week" | "month" | "year" | "all";

export const LOG_PERIOD_ORDER: readonly LogPeriod[] = ["day", "week", "month", "year", "all"];

const STORED = {
    all: 5,
    day: 1,
    month: 3,
    week: 2,
    year: 4,
} satisfies Record<LogPeriod, number>;

export function logPeriodFromStored(value: number): LogPeriod {
    return LOG_PERIOD_ORDER.find((p) => STORED[p] === value) ?? "month";
}

export function storedLogPeriod(period: LogPeriod): number {
    return STORED[period];
}

/** `null` for all-time, which has no lower bound. */
export function logPeriodStart(period: LogPeriod, now: Date, firstWeekday: number): Date | null {
    switch (period) {
        case "day": {
            return startOfDay(now);
        }
        case "week": {
            return startOfWeek(now, firstWeekday);
        }
        case "month": {
            return firstOfMonth(now);
        }
        case "year": {
            return startOfYear(now);
        }
        default: {
            return null;
        }
    }
}

// Net is a running balance from the first entry, so it takes no lower bound. The valuation is passed in because the
// screen may read the Log in an override currency.
export function useSparklineRows(
    db: Database,
    nowMs: number,
    enabled: boolean,
    cumulative: boolean,
    floor: Date | null,
    displayCurrency: string,
    rates: RateTable
): { date: Date; amount: number; income: boolean }[] {
    const columns = {
        amount: transactions.amount,
        amountUsd: transactions.amountUsd,
        currency: transactions.currency,
        date: transactions.date,
        exchangeRate: transactions.exchangeRate,
        exchangeRateType: transactions.exchangeRateType,
        income: transactions.income,
    };
    const pending = usePendingDeletes();
    const rows = useLiveQuery(
        transactions,
        () => {
            if (!enabled) {
                return NO_READ;
            }
            return db
                .select(columns)
                .from(transactions)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        lte(transactions.date, new Date(nowMs)),
                        cumulative || !floor ? undefined : gte(transactions.date, floor),
                        kept("transactions", pending)
                    )
                )
                .orderBy(asc(transactions.date));
        },
        [nowMs, enabled, cumulative, floor?.getTime() ?? null, pending],
        nowMs
    );

    const valued = valueDatedRowsIn(rows, displayCurrency, rates);
    return rows.map((row, index) => ({
        amount: valued[index] ?? 0,
        date: row.date,
        income: row.income,
    }));
}

// Without rates (or for rows no rate reaches) each currency keeps its bucket: a cross-currency sum is never invented.
export interface LogInsights {
    dominant: LogFigures;
    others: LogFigures[];
    perCurrency: LogFigures[];
}

export function useLogInsights(
    db: Database,
    nowMs: number,
    period: LogPeriod,
    firstWeekday: number,
    globalCurrency: string,
    rates?: RateTable
): LogInsights {
    const now = new Date(nowMs);
    const start = logPeriodStart(period, now, firstWeekday);

    const pending = usePendingDeletes();
    const rows = useLiveQuery(
        transactions,
        () => logCellQuery(db, start, now, pending),
        [nowMs, period, firstWeekday, pending],
        nowMs
    );
    return insightsFrom(rows, globalCurrency, rates);
}

/** The same span of the period before, for the head's trend. Null for all-time. */
export function usePreviousLogInsights(
    db: Database,
    nowMs: number,
    period: LogPeriod,
    firstWeekday: number,
    globalCurrency: string,
    rates?: RateTable
): LogInsights | null {
    const start = logPeriodStart(period, new Date(nowMs), firstWeekday);
    const window = period === "all" || start === null ? null : previousPeriodWindow(period, start, new Date(nowMs));
    const pending = usePendingDeletes();
    const rows = useLiveQuery(
        transactions,
        () => (window ? logCellQuery(db, window.start, window.end, pending) : NO_READ),
        [nowMs, period, firstWeekday, pending],
        nowMs
    );
    return window ? insightsFrom(rows, globalCurrency, rates) : null;
}

function insightsFrom(rows: readonly CellRow[], globalCurrency: string, rates: RateTable | undefined): LogInsights {
    const ordered = cellFigures(toCurrencyCells(rows), globalCurrency, rates);
    const dominant = ordered[0] ?? {
        count: 0,
        currencyCode: globalCurrency,
        expense: 0,
        income: 0,
    };
    const others = ordered.slice(1);
    return {
        dominant,
        others,
        perCurrency: [dominant, ...others],
    };
}

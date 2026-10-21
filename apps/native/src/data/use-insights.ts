import { valueDatedRowsIn } from "@outlayr/money/valuation";
import { and, gte, isNull, lte, min } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { useLanguage } from "@/i18n/context";

import {
    bucketSeries,
    categoryBreakdown,
    categoryMovers,
    DEFAULT_INSIGHTS_CALENDAR,
    elapsedSlots,
    offsetForDate,
    periodTotal,
    windowEnd,
    windowLabel,
    windowShortLabel,
    windowStart,
    windowTotals,
    withCategoryDeltas,
} from "./insights";
import type {
    CategoryBreakdownEntry,
    CategoryMeta,
    CategoryMover,
    InsightsBucket,
    InsightsCalendar,
    InsightsContribution,
    InsightsMeasure,
    InsightsPeriod,
} from "./insights";
import { useLiveQuery } from "./live-query";
import { useValuation } from "./use-valuation";

export interface UseInsightsResult {
    atCurrent: boolean;
    atEarliest: boolean;
    breakdown: CategoryBreakdownEntry[];
    buckets: InsightsBucket[];
    categoriesById: Map<string, CategoryMeta>;
    end: Date;
    /** The empty state turns on this, not on the window being empty. */
    hasHistory: boolean;
    income: number;
    label: string;
    measureAverage: number;
    movers: CategoryMover[];
    net: number;
    netAverage: number;
    nextLabel: string;
    prevLabel: string;
    priorLabel: string;
    priorMeasure: number;
    priorNet: number;
    rows: InsightsContribution[];
    spent: number;
    start: Date;
    total: number;
}

export function useInsights(
    db: Database,
    nowMs: number,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): UseInsightsResult {
    const { firstWeekday, firstDayOfMonth } = calendar;
    // Passed explicitly: the memo would freeze a `runtimeLanguage()` default on the previous language.
    const { language } = useLanguage();

    const queryStart = useMemo(
        () =>
            windowStart(period, new Date(nowMs), offset - 1, {
                firstDayOfMonth,
                firstWeekday,
            }),
        [period, nowMs, offset, firstWeekday, firstDayOfMonth]
    );

    const txData = useLiveQuery(
        transactions,
        () =>
            db
                .select({
                    amount: transactions.amount,
                    amountUsd: transactions.amountUsd,
                    categoryId: transactions.categoryId,
                    currency: transactions.currency,
                    date: transactions.date,
                    exchangeRate: transactions.exchangeRate,
                    exchangeRateType: transactions.exchangeRateType,
                    income: transactions.income,
                })
                .from(transactions)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        gte(transactions.date, queryStart),
                        lte(transactions.date, new Date(nowMs))
                    )
                ),
        [nowMs, queryStart.getTime()],
        nowMs
    );

    // Its own aggregate: the loaded set is two windows wide and cannot know where history begins.
    const earliestData = useLiveQuery(transactions, () =>
        db
            .select({ earliest: min(transactions.date) })
            .from(transactions)
            .where(isNull(transactions.deletedAt))
    );

    const catData = useLiveQuery(categories, () => db.select().from(categories).where(isNull(categories.deletedAt)));

    const { displayCurrency, rates } = useValuation(db);

    return useMemo(() => {
        const cal: InsightsCalendar = { firstDayOfMonth, firstWeekday };
        const categoriesById = new Map<string, CategoryMeta>();
        for (const category of catData) {
            categoriesById.set(category.id, {
                color: category.color,
                emoji: category.emoji,
                icon: category.icon,
                id: category.id,
                income: category.income,
                name: category.name,
                parentId: category.parentId,
            });
        }
        // parentId comes from this map, not a join: `useLiveQuery` only invalidates on its watched table, so a joined
        // parentId would survive a re-parent and bucket spend under the old parent.
        const valued = valueDatedRowsIn(txData, displayCurrency, rates);
        const rows: InsightsContribution[] = txData.map((row, index) => ({
            // `amount` is the valued amount from here down, not the row's stored one.
            amount: valued[index],
            categoryId: row.categoryId,
            date: row.date,
            income: row.income,
            parentId: row.categoryId ? (categoriesById.get(row.categoryId)?.parentId ?? null) : null,
        }));
        const now = new Date(nowMs);
        const buckets = bucketSeries(rows, period, measure, now, offset, cal, language);
        const total = periodTotal(buckets);
        const { income, spent } = windowTotals(rows, period, now, offset, cal);
        const prior = windowTotals(rows, period, now, offset - 1, cal);
        const net = income - spent;
        const divisor = elapsedSlots(period, now, offset, cal);

        // SQLite returns `min()` as the stored integer (timestamp_ms), or null on an empty table.
        const earliestRaw = earliestData[0]?.earliest ?? null;
        const earliest = earliestRaw == null ? null : new Date(Number(earliestRaw));
        const minOffset = earliest ? Math.min(0, offsetForDate(period, earliest, now, cal)) : 0;

        const composition = categoryBreakdown(rows, categoriesById, period, measure, now, offset, cal);
        const priorComposition = categoryBreakdown(rows, categoriesById, period, measure, now, offset - 1, cal);
        let compositionTotal = 0;
        for (const item of composition) {
            compositionTotal += item.amount;
        }

        return {
            atCurrent: offset >= 0,
            atEarliest: offset <= minOffset,
            breakdown: withCategoryDeltas(composition, priorComposition),
            buckets,
            categoriesById,
            end: windowEnd(period, now, offset, cal),
            hasHistory: earliest != null,
            income,
            label: windowLabel(period, offset, now, cal, language),
            measureAverage: total / divisor,
            movers: categoryMovers(composition, priorComposition, compositionTotal),
            net,
            netAverage: Math.abs(net) / divisor,
            nextLabel: windowShortLabel(period, offset + 1, now, cal, language),
            prevLabel: windowShortLabel(period, offset - 1, now, cal, language),
            priorLabel: windowLabel(period, offset - 1, now, cal, language),
            priorMeasure: measure === "income" ? prior.income : prior.spent,
            priorNet: prior.income - prior.spent,
            rows,
            spent,
            start: windowStart(period, now, offset, cal),
            total,
        };
    }, [
        txData,
        catData,
        earliestData,
        displayCurrency,
        rates,
        nowMs,
        period,
        measure,
        offset,
        firstWeekday,
        firstDayOfMonth,
        language,
    ]);
}

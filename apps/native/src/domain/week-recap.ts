import { addDays, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";

import { aggregateInsightsWindows, categoryMovers, DEFAULT_INSIGHTS_CALENDAR } from "@/domain/insights";
import type { CategoryMeta, CategoryMover, InsightsContribution } from "@/domain/insights";
import type { Language } from "@/i18n/languages";

import { addLocalDays, localDayKey } from "./local-day";
import type { RecapRow } from "./month-recap";

const WEEK_DAYS = 7;

export interface WeekRecapInput {
    categoriesById: ReadonlyMap<string, CategoryMeta>;
    firstWeekday: number;
    language?: Language;
    now: Date;
    rows: readonly RecapRow[];
    valuation: { displayCurrency: string; rates: RateTable };
    week: Date;
}

export interface WeekRecap {
    daily: number[];
    days: boolean[];
    daysLogged: number;
    entries: number;
    movers: CategoryMover[];
    priorEntries: number;
    priorSpent: number;
    spent: number;
    spentChange: number | null;
    start: Date;
    topCategory: { amount: number; name: string } | null;
}

export function weekRecap({
    categoriesById,
    firstWeekday,
    language,
    now,
    rows,
    valuation,
    week,
}: WeekRecapInput): WeekRecap {
    const { displayCurrency, rates } = valuation;
    const start = startOfWeek(week, firstWeekday);
    // Where midnight is skipped for DST the week starts at 01:00; re-cut neighbours at their own midnight.
    const endMs = startOfDay(addDays(start, WEEK_DAYS)).getTime();
    const startMs = start.getTime();
    const ref = new Date(Math.min(now.getTime(), endMs - 1));
    const priorStartMs = startOfDay(addDays(start, -WEEK_DAYS)).getTime();

    const valued = valueDatedRowsIn(rows, displayCurrency, rates);
    const contributions: InsightsContribution[] = rows.map((row, index) => ({
        amount: valued[index] ?? 0,
        categoryId: row.categoryId,
        date: row.date,
        income: row.income,
        parentId: row.parentId,
    }));
    const aggregate = aggregateInsightsWindows(
        contributions,
        categoriesById,
        "week",
        "spent",
        ref,
        0,
        { ...DEFAULT_INSIGHTS_CALENDAR, firstWeekday },
        language
    );

    let entries = 0;
    let priorEntries = 0;
    const logged: number[] = [];
    for (const row of rows) {
        const at = row.date.getTime();
        if (at >= startMs && at <= ref.getTime()) {
            entries += 1;
            logged.push(at);
        } else if (at >= priorStartMs && at < startMs) {
            priorEntries += 1;
        }
    }

    const loggedKeys = new Set(logged.map(localDayKey));
    const days = Array.from({ length: WEEK_DAYS }, (_, offset) =>
        loggedKeys.has(localDayKey(addLocalDays(startMs, offset)))
    );

    let categoriesTotal = 0;
    for (const entry of aggregate.categories) {
        categoriesTotal += entry.amount;
    }
    const [top] = aggregate.categories;

    return {
        daily: aggregate.buckets.map((bucket) => bucket.value),
        days,
        daysLogged: days.filter(Boolean).length,
        entries,
        movers: categoryMovers(aggregate.categories, aggregate.priorCategories, categoriesTotal),
        priorEntries,
        priorSpent: aggregate.priorSpent,
        spent: aggregate.spent,
        spentChange: aggregate.priorSpent > 0 ? (aggregate.spent - aggregate.priorSpent) / aggregate.priorSpent : null,
        start,
        topCategory: top === undefined ? null : { amount: top.amount, name: top.name },
    };
}

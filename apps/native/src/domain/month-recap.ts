import { addMonths, firstOfMonth } from "@outlayr/money/calendar";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import type { DatedValuable, RateTable } from "@outlayr/money/valuation";

import { aggregateInsightsWindows, categoryMovers } from "@/data/insights";
import type { CategoryBreakdownEntry, CategoryMeta, CategoryMover, InsightsContribution } from "@/data/insights";
import type { Language } from "@/i18n/languages";

import { loggedDays } from "./month-days";

const TOP_CATEGORY_LIMIT = 4;

export interface RecapRow extends DatedValuable {
    categoryId: string | null;
    income: boolean;
    parentId: string | null;
}

export interface RecapInput {
    categoriesById: ReadonlyMap<string, CategoryMeta>;
    language?: Language;
    month: Date;
    now: Date;
    rows: readonly RecapRow[];
    valuation: { displayCurrency: string; rates: RateTable };
}

export interface MonthRecap {
    days: boolean[];
    daysInMonth: number;
    daysLogged: number;
    entries: number;
    inflation: number | null;
    movers: CategoryMover[];
    priorSpent: number;
    spent: number;
    spentAtTodayRate: number;
    spentChange: number | null;
    start: Date;
    topCategories: CategoryBreakdownEntry[];
}

export function monthRecap({ categoriesById, language, month, now, rows, valuation }: RecapInput): MonthRecap {
    const { displayCurrency, rates } = valuation;
    const start = firstOfMonth(month);
    const end = addMonths(start, 1);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const ref = new Date(Math.min(now.getTime(), endMs - 1));

    const valued = valueDatedRowsIn(rows, displayCurrency, rates);
    const valuedToday = valueDatedRowsIn(
        rows.map((row) => ({ ...row, date: now })),
        displayCurrency,
        rates
    );
    const contributions: InsightsContribution[] = rows.map((row, index) => ({
        amount: valued[index],
        categoryId: row.categoryId,
        date: row.date,
        income: row.income,
        parentId: row.parentId,
    }));
    const aggregate = aggregateInsightsWindows(
        contributions,
        categoriesById,
        "month",
        "spent",
        ref,
        0,
        undefined,
        language
    );

    let spentAtTodayRate = 0;
    let foreign = false;
    let entries = 0;
    const loggedAt: number[] = [];
    for (const [index, row] of rows.entries()) {
        const at = row.date.getTime();
        if (at < startMs || at > ref.getTime()) {
            continue;
        }
        entries += 1;
        loggedAt.push(at);
        if (row.income) {
            continue;
        }
        spentAtTodayRate += valuedToday[index];
        foreign ||= row.currency !== null && row.currency !== displayCurrency;
    }

    const decimals = decimalsFor(displayCurrency);
    const days = loggedDays(start, loggedAt);
    let categoriesTotal = 0;
    for (const entry of aggregate.categories) {
        categoriesTotal += entry.amount;
    }

    return {
        days,
        daysInMonth: days.length,
        daysLogged: days.filter(Boolean).length,
        entries,
        inflation: foreign ? roundMoney(spentAtTodayRate - aggregate.spent, decimals) : null,
        movers: categoryMovers(aggregate.categories, aggregate.priorCategories, categoriesTotal),
        priorSpent: aggregate.priorSpent,
        spent: aggregate.spent,
        spentAtTodayRate: roundMoney(spentAtTodayRate, decimals),
        spentChange: aggregate.priorSpent > 0 ? (aggregate.spent - aggregate.priorSpent) / aggregate.priorSpent : null,
        start,
        topCategories: aggregate.categories.slice(0, TOP_CATEGORY_LIMIT),
    };
}

import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { limitIn } from "@outlayr/money/valuation";
import {
    monthKey,
    monthKeyAt,
    monthKeyParts,
    monthKeyWindow,
    projectYear,
    shiftMonthKey,
} from "@outlayr/money/year-plan";
import type { MonthKey, PlanFlow, PlanGoal, YearPlanInput, YearProjection } from "@outlayr/money/year-plan";
import { useMemo } from "react";

import { accountRows } from "@/components/dashboard/accounts/model";
import { goalViews } from "@/components/dashboard/goals/model";
import type { GoalView } from "@/components/dashboard/goals/model";
import { useRecurringData } from "@/components/dashboard/recurring/data";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR, startOfDay } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { addDays, chargesIn, isActive } from "@/lib/recurring";
import type { Schedule } from "@/lib/recurring";

/** Entries with no category still count toward the month; they get a row but no plan of their own. */
export const UNCATEGORIZED_IN = "uncategorized:in";
export const UNCATEGORIZED_OUT = "uncategorized:out";

export interface PlanCategoryMeta {
    color: string;
    id: string;
    income: boolean;
    name: string | null;
    /** False for the uncategorized buckets, which have no category row to hang a plan on. */
    plannable: boolean;
}

export interface PlanGoalMeta {
    id: string;
    name: string;
    perMonth: number;
    target: number;
    targetDay: string | null;
}

export interface YearPlan {
    categories: ReadonlyMap<string, PlanCategoryMeta>;
    currentKey: MonthKey;
    goals: ReadonlyMap<string, PlanGoalMeta>;
    input: YearPlanInput;
    projection: YearProjection;
}

const MONTHS_PER_YEAR = 12;
const LOOKBACK_MONTHS = 6;
const NOON = 12;

export const monthKeyOf = (periodKey: string): MonthKey =>
    monthKey(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1);

export function periodKeyOfMonth(key: MonthKey): string {
    const { monthIndex, year } = monthKeyParts(key);
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

// The year plan reads local dates, so each logged day lands mid-day in the browser's zone and never slips a month.
const localDay = (day: string, hour = NOON, minute = 0, second = 0) =>
    new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour, minute, second);

const isoDay = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function monthlyLimit(amount: number, type: number): number {
    switch (type) {
        case BUDGET_TYPE.day: {
            return (amount * 365) / MONTHS_PER_YEAR;
        }
        case BUDGET_TYPE.week: {
            return (amount * 52) / MONTHS_PER_YEAR;
        }
        case BUDGET_TYPE.year: {
            return amount / MONTHS_PER_YEAR;
        }
        default: {
            return amount;
        }
    }
}

function upcomingCharges(schedule: Schedule, ledger: Ledger, through: string) {
    const { next } = schedule;
    if (!isActive(schedule) || next === null || next.day > through) {
        return [];
    }
    const later = chargesIn(
        { ...schedule.chain, start: next.at + ledger.offsetAt(next.at) },
        addDays(next.day, 1),
        through,
        ledger.offsetAt
    );
    return [next, ...later].filter((charge) => charge.day > ledger.today);
}

/**
 * Everything the projection reads for `year`, valued into the ledger's currency. Logged entries reach six months
 * behind the running month so each category has a typical month to fall back on.
 */
export function yearPlanOf(
    ledger: Ledger,
    schedules: readonly Schedule[],
    savings: readonly GoalView[],
    year: number
): YearPlan {
    const { firstDayOfMonth } = ledger;
    const now = localDay(ledger.today, 23, 59, 59);
    const currentKey = monthKeyAt(now, firstDayOfMonth);
    const lookback = isoDay(
        new Date(
            Math.min(
                monthKeyWindow(shiftMonthKey(currentKey, -LOOKBACK_MONTHS), firstDayOfMonth).start.getTime(),
                monthKeyWindow(monthKey(year, 0), firstDayOfMonth).start.getTime()
            )
        )
    );
    const yearEnd = addDays(isoDay(monthKeyWindow(monthKey(year, 11), firstDayOfMonth).end), -1);

    const filed = new Map(
        ledger.books.categories.filter((row) => row.deletedAt === null).map((row) => [row.localId, row])
    );
    const topLevel = (categoryId: string | null, income: boolean): string => {
        const row = categoryId === null ? undefined : filed.get(categoryId);
        if (!row) {
            return income ? UNCATEGORIZED_IN : UNCATEGORIZED_OUT;
        }
        return row.parentId !== null && filed.has(row.parentId) ? row.parentId : row.localId;
    };

    const meta = new Map<string, PlanCategoryMeta>();
    for (const row of filed.values()) {
        if (row.parentId === null || !filed.has(row.parentId)) {
            meta.set(row.localId, {
                color: row.color ?? NEUTRAL_COLOR,
                id: row.localId,
                income: row.income,
                name: row.name,
                plannable: true,
            });
        }
    }
    for (const [id, income] of [
        [UNCATEGORIZED_IN, true],
        [UNCATEGORIZED_OUT, false],
    ] as const) {
        meta.set(id, { color: NEUTRAL_COLOR, id, income, name: null, plannable: false });
    }

    const flows: PlanFlow[] = ledger.rows
        .filter((row) => row.day >= lookback)
        .map((row) => ({
            amount: row.amount,
            categoryId: topLevel(row.categoryId, row.income),
            date: localDay(row.day),
            income: row.income,
        }));

    // From tomorrow: whatever lands today has been logged already, or will be by the sweep.
    const scheduled: PlanFlow[] = schedules.flatMap((schedule) =>
        upcomingCharges(schedule, ledger, yearEnd).map((charge) => ({
            amount: schedule.worth,
            categoryId: topLevel(schedule.seed.categoryId, schedule.seed.income),
            date: localDay(charge.day),
            income: schedule.seed.income,
        }))
    );

    // Rates are keyed by the UTC day of the instant, so the month opens in the ledger's zone, not the browser's.
    const opensOn = (key: MonthKey) => new Date(startOfDay(ledger, isoDay(monthKeyWindow(key, firstDayOfMonth).start)));
    const plans = new Map<string, Map<MonthKey, number>>();
    for (const row of ledger.books.budgetPlans) {
        const inYear = row.month >= monthKey(year, 0) && row.month <= monthKey(year, 11);
        if (row.deletedAt !== null || row.amount === null || !inYear || !meta.has(row.categoryId)) {
            continue;
        }
        const opens = opensOn(row.month);
        const amount = limitIn(
            { amount: row.amount, amountUsd: null, currency: row.currency },
            opens,
            ledger.currency,
            ledger.rates
        );
        const months = plans.get(row.categoryId) ?? new Map<MonthKey, number>();
        months.set(row.month, amount);
        plans.set(row.categoryId, months);
    }

    const budgets = new Map<string, number>();
    const opens = opensOn(currentKey);
    for (const row of ledger.books.budgets) {
        if (row.deletedAt === null && row.categoryId !== null && meta.has(row.categoryId)) {
            budgets.set(row.categoryId, monthlyLimit(limitIn(row, opens, ledger.currency, ledger.rates), row.type));
        }
    }

    const goals = new Map<string, PlanGoalMeta>();
    const goalInputs: PlanGoal[] = [];
    for (const { id, name, progress, target, targetDay } of savings) {
        if (!progress.pace) {
            continue;
        }
        const { monthsLeft, perMonth } = progress.pace;
        goals.set(id, { id, name, perMonth, target, targetDay });
        goalInputs.push({ id, perMonth, throughKey: shiftMonthKey(currentKey, Math.max(0, monthsLeft - 1)) });
    }

    const input: YearPlanInput = {
        budgets,
        categories: [...meta.values()].map(({ id, income }) => ({ id, income })),
        firstDayOfMonth,
        flows,
        goals: goalInputs,
        now,
        plans,
        scheduled,
        year,
    };
    return { categories: meta, currentKey, goals, input, projection: projectYear(input) };
}

export function useYearPlan(year: number): YearPlan {
    const { ledger, overview } = useDashboard();
    const { model } = useRecurringData();
    return useMemo(
        () => yearPlanOf(ledger, model.schedules, goalViews(ledger, accountRows(ledger, overview)), year),
        [ledger, model.schedules, overview, year]
    );
}

/** The snap a dragged or suggested amount lands on, coarser as the axis grows. */
export function planStep(axisTop: number): number {
    if (axisTop <= 500) {
        return 5;
    }
    if (axisTop <= 2500) {
        return 10;
    }
    return axisTop <= 10_000 ? 50 : 100;
}

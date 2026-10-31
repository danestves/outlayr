import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { addDays, startOfDay } from "@outlayr/money/calendar";
import { limitIn, valueDatedRowsIn } from "@outlayr/money/valuation";
import { and, gte, isNotNull, isNull, lte } from "drizzle-orm";

import { useSettingNumber } from "@/contexts/display-settings-context";
import type { Database } from "@/db/client";
import { budgetPlans, budgets, categories, transactions } from "@/db/schema";
import { isPayoffPlan } from "@/domain/savings-goal";
import { occurrencesBetween } from "@/domain/upcoming";
import { monthKey, monthKeyAt, monthKeyWindow, projectYear, shiftMonthKey } from "@/domain/year-plan";
import type { MonthKey, PlanFlow, YearPlanInput, YearProjection } from "@/domain/year-plan";

import { budgetPlansQuery } from "./budget-plans-core";
import { useLiveQuery } from "./live-query";
import { useUpcomingTransactions } from "./log-filtered";
import { useSavingsGoals } from "./savings-goals";
import { useValuation } from "./use-valuation";

/** Entries with no category still count toward the month; they get a row but no plan of their own. */
export const UNCATEGORIZED_IN = "uncategorized:in";
export const UNCATEGORIZED_OUT = "uncategorized:out";

export interface PlanCategoryMeta {
    color: string | null;
    emoji: string | null;
    icon: string | null;
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
    targetDate: Date;
}

export interface YearPlan {
    categories: ReadonlyMap<string, PlanCategoryMeta>;
    currency: string;
    goals: ReadonlyMap<string, PlanGoalMeta>;
    input: YearPlanInput;
    projection: YearProjection;
}

const MONTHS_PER_YEAR = 12;
const LOOKBACK_MONTHS = 6;

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

/**
 * Everything the projection reads for `year`, valued into the ledger's currency. Logged entries reach six months
 * behind the running month so each category has a typical month to fall back on.
 */
export function useYearPlan(db: Database, nowMs: number, year: number): YearPlan {
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const { displayCurrency, rates } = useValuation(db);
    const now = new Date(nowMs);
    const currentKey = monthKeyAt(now, firstDayOfMonth);
    const lookback = Math.min(
        monthKeyWindow(shiftMonthKey(currentKey, -LOOKBACK_MONTHS), firstDayOfMonth).start.getTime(),
        monthKeyWindow(monthKey(year, 0), firstDayOfMonth).start.getTime()
    );
    const yearEnd = monthKeyWindow(monthKey(year, 11), firstDayOfMonth).end;

    const categoryRows = useLiveQuery(categories, () =>
        db.select().from(categories).where(isNull(categories.deletedAt))
    );
    const logged = useLiveQuery(
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
                        gte(transactions.date, new Date(lookback)),
                        lte(transactions.date, now)
                    )
                ),
        [lookback, nowMs],
        nowMs
    );
    const planRows = useLiveQuery(budgetPlans, () => budgetPlansQuery(db, monthKey(year, 0), monthKey(year, 11)), [
        year,
    ]);
    const budgetRows = useLiveQuery(budgets, () =>
        db
            .select({
                amount: budgets.amount,
                amountUsd: budgets.amountUsd,
                categoryId: budgets.categoryId,
                currency: budgets.currency,
                type: budgets.type,
            })
            .from(budgets)
            .where(and(isNull(budgets.deletedAt), isNotNull(budgets.categoryId)))
    );
    const { schedules } = useUpcomingTransactions(db, nowMs, false);
    const savings = useSavingsGoals(db, nowMs);

    const parents = new Map(categoryRows.map((row) => [row.id, row.parentId]));
    const topLevel = (categoryId: string | null, income: boolean): string => {
        if (categoryId === null || !parents.has(categoryId)) {
            return income ? UNCATEGORIZED_IN : UNCATEGORIZED_OUT;
        }
        const parentId = parents.get(categoryId) ?? null;
        return parentId !== null && parents.has(parentId) ? parentId : categoryId;
    };

    const meta = new Map<string, PlanCategoryMeta>();
    for (const row of categoryRows) {
        if (row.parentId === null || !parents.has(row.parentId)) {
            meta.set(row.id, {
                color: row.color,
                emoji: row.emoji,
                icon: row.icon,
                id: row.id,
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
        meta.set(id, { color: null, emoji: null, icon: null, id, income, name: null, plannable: false });
    }

    const valuedLogged = valueDatedRowsIn(logged, displayCurrency, rates);
    const flows: PlanFlow[] = logged.map((row, index) => ({
        amount: valuedLogged[index],
        categoryId: topLevel(row.categoryId, row.income),
        date: row.date,
        income: row.income,
    }));

    // From tomorrow: whatever lands today has been logged already, or will be by the sweep.
    const upcoming = occurrencesBetween(schedules, now, addDays(startOfDay(now), 1), yearEnd);
    const valuedUpcoming = valueDatedRowsIn(upcoming, displayCurrency, rates);
    const scheduled: PlanFlow[] = upcoming.map((row, index) => ({
        amount: valuedUpcoming[index],
        categoryId: topLevel(row.categoryId, row.income),
        date: row.date,
        income: row.income,
    }));

    const plans = new Map<string, Map<MonthKey, number>>();
    for (const row of planRows) {
        if (row.amount === null || !meta.has(row.categoryId)) {
            continue;
        }
        const opens = monthKeyWindow(row.month, firstDayOfMonth).start;
        const amount = limitIn(
            { amount: row.amount, amountUsd: null, currency: row.currency },
            opens,
            displayCurrency,
            rates
        );
        let months = plans.get(row.categoryId);
        if (!months) {
            months = new Map();
            plans.set(row.categoryId, months);
        }
        months.set(row.month, amount);
    }

    const budgetsByCategory = new Map<string, number>();
    const opens = monthKeyWindow(currentKey, firstDayOfMonth).start;
    for (const row of budgetRows) {
        if (row.categoryId !== null && meta.has(row.categoryId)) {
            budgetsByCategory.set(row.categoryId, monthlyLimit(limitIn(row, opens, displayCurrency, rates), row.type));
        }
    }

    const goals = new Map<string, PlanGoalMeta>();
    const goalInputs: YearPlanInput["goals"][number][] = [];
    for (const { goal, progress, target } of savings) {
        if (isPayoffPlan(goal) || !progress.pace) {
            continue;
        }
        const { monthsLeft, perMonth } = progress.pace;
        goals.set(goal.id, { id: goal.id, name: goal.name, perMonth, target, targetDate: goal.targetDate });
        goalInputs.push({ id: goal.id, perMonth, throughKey: shiftMonthKey(currentKey, Math.max(0, monthsLeft - 1)) });
    }

    const input: YearPlanInput = {
        budgets: budgetsByCategory,
        categories: [...meta.values()].map(({ id, income }) => ({ id, income })),
        firstDayOfMonth,
        flows,
        goals: goalInputs,
        now,
        plans,
        scheduled,
        year,
    };

    return { categories: meta, currency: displayCurrency, goals, input, projection: projectYear(input) };
}

import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { startOfDay } from "@outlayr/money/calendar";
import { landingDate } from "@outlayr/money/recurrence";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";

import type { Database } from "@/db/client";
import { buildAnswers, periodProgress, PRIOR_PERIODS, stayUnder } from "@/domain/insights-answers";
import type { Answers, PeriodProgress, StayUnder } from "@/domain/insights-answers";

import { useExpenseContributions, useMainBudget, usePerCategoryBudgets } from "./budgets";
import { goesWithPendingDelete } from "./card-fees-core";
import { windowEnd, windowStart } from "./insights";
import type { InsightsCalendar, InsightsPeriod } from "./insights";
import { useUpcomingTransactions } from "./log-filtered";
import { usePendingDeletes } from "./use-deferred-delete";
import { useValuation } from "./use-valuation";

const BUDGET_TYPE_OF_PERIOD = {
    month: BUDGET_TYPE.month,
    week: BUDGET_TYPE.week,
    year: BUDGET_TYPE.year,
} as const satisfies Record<InsightsPeriod, number>;

export interface SubscriptionItem {
    id: string;
    name: string;
    next: Date;
    perMonth: number;
}

export interface SubscriptionDetail {
    items: SubscriptionItem[];
    next: SubscriptionItem;
    perMonth: number;
}

export interface InsightsAnswersResult {
    answers: Answers;
    budgetIds: ReadonlyMap<string, string>;
    limit: number | null;
    progress: PeriodProgress;
    stayUnder: StayUnder | null;
    subscriptions: SubscriptionDetail | null;
}

function priorWindows(period: InsightsPeriod, now: Date, offset: number, calendar: InsightsCalendar): BudgetWindow[] {
    return Array.from({ length: PRIOR_PERIODS }, (_, index) => {
        const back = offset - 1 - index;
        return { end: windowEnd(period, now, back, calendar), start: windowStart(period, now, back, calendar) };
    });
}

function opensWith(budget: { type: number; window: BudgetWindow }, period: InsightsPeriod, window: BudgetWindow) {
    return budget.type === BUDGET_TYPE_OF_PERIOD[period] && budget.window.start.getTime() === window.start.getTime();
}

function useSubscriptions(db: Database, nowMs: number, enabled: boolean): SubscriptionDetail | null {
    const { displayCurrency, rates } = useValuation(db);
    const pending = usePendingDeletes();
    const scheduled = useUpcomingTransactions(db, nowMs, false, enabled);
    const now = new Date(nowMs);
    const today = startOfDay(now).getTime();

    const items: SubscriptionItem[] = [];
    for (const row of scheduled.schedules) {
        const ended = row.recurringEndDate != null && startOfDay(row.recurringEndDate).getTime() < today;
        if (row.recurringType <= 0 || row.income || ended || goesWithPendingDelete(row, pending.row)) {
            continue;
        }
        const bucket = monthlySubscriptionCost([row], displayCurrency, rates, now).find(
            (candidate) => candidate.currencyCode === displayCurrency
        );
        items.push({
            id: row.id,
            name: row.note.trim() || row.categoryName || "",
            next: landingDate(row, now),
            perMonth: Math.abs(bucket?.amount ?? 0),
        });
    }

    const [soonest] = [...items].sort((a, b) => a.next.getTime() - b.next.getTime());
    if (!enabled || !soonest) {
        return null;
    }
    return {
        items: items.sort((a, b) => b.perMonth - a.perMonth),
        next: soonest,
        perMonth: items.reduce((sum, item) => sum + item.perMonth, 0),
    };
}

export function useInsightsAnswers(
    db: Database,
    nowMs: number,
    period: InsightsPeriod,
    offset: number,
    calendar: InsightsCalendar
): InsightsAnswersResult {
    const now = new Date(nowMs);
    const closed = offset < 0;
    const contributions = useExpenseContributions(db, nowMs);
    const main = useMainBudget(db, nowMs, contributions);
    const budgets = usePerCategoryBudgets(db, nowMs, contributions);
    const subscriptions = useSubscriptions(db, nowMs, !closed);

    const window = { end: windowEnd(period, now, offset, calendar), start: windowStart(period, now, offset, calendar) };
    const progress = periodProgress(window, now, closed);

    const limit = !closed && main && opensWith(main, period, window) ? main.amount : null;
    const opened = closed
        ? []
        : budgets.filter((budget) => budget.categoryId !== null && opensWith(budget, period, window));
    const categoryLimits = opened.flatMap((budget) =>
        budget.categoryId ? [{ categoryId: budget.categoryId, limit: budget.amount }] : []
    );

    const answers = buildAnswers({
        categoryLimits,
        limit,
        prior: priorWindows(period, now, offset, calendar),
        rows: contributions,
        progress,
        subscriptions: subscriptions ? { count: subscriptions.items.length, perMonth: subscriptions.perMonth } : null,
    });

    return {
        answers,
        budgetIds: new Map(
            opened.flatMap((budget): [string, string][] => (budget.categoryId ? [[budget.categoryId, budget.id]] : []))
        ),
        limit,
        progress,
        stayUnder: limit == null ? null : stayUnder(limit, answers.spent, window, now),
        subscriptions,
    };
}

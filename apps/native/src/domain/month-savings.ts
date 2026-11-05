import { categoryBudgetFigures, overallBudgetFigures } from "@outlayr/money/budget-figures";
import type { BudgetFigures, StoredBudget } from "@outlayr/money/budget-figures";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE, periodEnd, previousPeriodStart } from "@outlayr/money/budget-window";
import { addMonths, firstOfMonth } from "@outlayr/money/calendar";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import type { RateTable } from "@outlayr/money/valuation";

import type { ProCost } from "./pro-plans";

const PRIOR_MONTHS = 3;
const MIN_PRIOR_MONTHS_WITH_SPEND = 2;
export const YEAR_MONTHS = 12;
const YEAR_NAMES = 3;

export interface SavingsBudget extends StoredBudget {
    categoryId: string | null;
    name: string;
    overall: boolean;
    parentId: string | null;
}

export interface MonthSavingsInput {
    budgets: readonly SavingsBudget[];
    categoryNames: ReadonlyMap<string, string>;
    contributions: readonly ExpenseContribution[];
    month: Date;
    now: Date;
    valuation: { displayCurrency: string; rates: RateTable };
}

export interface CategoryDrop {
    amount: number;
    average: number;
    id: string;
    name: string;
}

export interface MonthSavings {
    budgetsKept: number;
    budgetsTotal: number;
    drop: CategoryDrop | null;
    hasBudgets: boolean;
    kept: number;
    overNames: string[];
    underBudgets: number;
}

const NOTHING: MonthSavings = {
    budgetsKept: 0,
    budgetsTotal: 0,
    drop: null,
    hasBudgets: false,
    kept: 0,
    overNames: [],
    underBudgets: 0,
};

function closedWindowOffset(budget: SavingsBudget, monthStart: Date, startDate: Date, now: Date): number | null {
    const monthEndMs = addMonths(monthStart, 1).getTime();
    let { start } = advanceBudgetWindow(startDate, budget.type, now);
    let offset = 0;
    while (start.getTime() >= monthEndMs) {
        const previous = previousPeriodStart(start, budget.type);
        if (previous.getTime() >= start.getTime()) {
            return null;
        }
        start = previous;
        offset -= 1;
    }
    const startsInMonth = start.getTime() >= monthStart.getTime();
    return startsInMonth && periodEnd(start, budget.type).getTime() <= now.getTime() ? offset : null;
}

function monthFigures(budget: SavingsBudget, input: MonthSavingsInput, monthStart: Date): BudgetFigures | null {
    if (budget.type !== BUDGET_TYPE.month || budget.startDate === null) {
        return null;
    }
    const { contributions, now, valuation } = input;
    const periodOffset = closedWindowOffset(budget, monthStart, budget.startDate, now);
    if (periodOffset === null) {
        return null;
    }
    const options = { displayCurrency: valuation.displayCurrency, now, periodOffset, rates: valuation.rates };
    const figures = budget.overall
        ? overallBudgetFigures(budget, contributions, options)
        : categoryBudgetFigures(budget, contributions, options);
    const existed = budget.dateCreated === null || budget.dateCreated.getTime() <= figures.window.start.getTime();
    return existed && figures.spent > 0 ? figures : null;
}

function covers(outer: SavingsBudget, inner: SavingsBudget): boolean {
    if (inner.overall) {
        return false;
    }
    return outer.overall || (outer.categoryId !== null && outer.categoryId === inner.parentId);
}

function biggestDrop(
    input: MonthSavingsInput,
    monthStart: Date,
    skipped: ReadonlySet<string>,
    decimals: number
): CategoryDrop | null {
    const monthIndex = monthStart.getFullYear() * 12 + monthStart.getMonth();
    const byCategory = new Map<string, number[]>();
    for (const row of input.contributions) {
        const topId = row.parentId ?? row.categoryId;
        const ago = monthIndex - (row.date.getFullYear() * 12 + row.date.getMonth());
        if (topId === null || ago < 0 || ago > PRIOR_MONTHS) {
            continue;
        }
        const months = byCategory.get(topId) ?? Array.from({ length: PRIOR_MONTHS + 1 }, () => 0);
        months[ago] = (months[ago] ?? 0) + row.amount;
        byCategory.set(topId, months);
    }

    let best: CategoryDrop | null = null;
    for (const [id, [spent = 0, ...before]] of byCategory) {
        const name = input.categoryNames.get(id);
        const monthsWithSpend = before.filter((amount) => amount > 0).length;
        if (name === undefined || skipped.has(id) || spent <= 0 || monthsWithSpend < MIN_PRIOR_MONTHS_WITH_SPEND) {
            continue;
        }
        const average = roundMoney(before.reduce((sum, amount) => sum + amount, 0) / PRIOR_MONTHS, decimals);
        const amount = roundMoney(average - spent, decimals);
        if (amount > 0 && (best === null || amount > best.amount)) {
            best = { amount, average, id, name };
        }
    }
    return best;
}

export function monthSavings(input: MonthSavingsInput): MonthSavings {
    const monthStart = firstOfMonth(input.month);
    if (addMonths(monthStart, 1).getTime() > input.now.getTime()) {
        return NOTHING;
    }

    const decimals = decimalsFor(input.valuation.displayCurrency);
    const counted = input.budgets.flatMap((budget) => {
        const figures = monthFigures(budget, input, monthStart);
        return figures === null ? [] : [{ budget, figures }];
    });
    const kept = counted.filter(({ figures }) => !figures.overBudget);
    const standing = kept.filter(({ budget }) => !kept.some((other) => covers(other.budget, budget)));
    const underBudgets = roundMoney(
        standing.reduce((sum, { figures }) => sum + Math.max(0, figures.limit - figures.spent), 0),
        decimals
    );
    const skipped = new Set(
        kept
            .flatMap(({ budget }) => (budget.overall ? [] : [budget.categoryId, budget.parentId]))
            .filter((id) => id !== null)
    );
    const drop = biggestDrop(input, monthStart, skipped, decimals);

    return {
        budgetsKept: kept.length,
        budgetsTotal: counted.length,
        drop,
        hasBudgets: input.budgets.some((budget) => budget.type === BUDGET_TYPE.month),
        kept: roundMoney(underBudgets + (drop?.amount ?? 0), decimals),
        overNames: counted.filter(({ figures }) => figures.overBudget).map(({ budget }) => budget.name),
        underBudgets,
    };
}

export function proRowCost(kept: number, cost: ProCost | null, displayCurrency: string): number | null {
    return cost !== null && cost.currency === displayCurrency && kept > cost.monthly ? cost.monthly : null;
}

export interface YearSavings {
    belowAverage: number;
    belowNames: string[];
    from: Date;
    kept: number;
    monthsUnder: number;
    to: Date;
}

export function yearSavings(input: Omit<MonthSavingsInput, "month">): YearSavings {
    const to = addMonths(firstOfMonth(input.now), -1);
    const from = addMonths(to, 1 - YEAR_MONTHS);
    const decimals = decimalsFor(input.valuation.displayCurrency);
    let kept = 0;
    let belowAverage = 0;
    let monthsUnder = 0;
    const dropped = new Map<string, { amount: number; name: string }>();
    for (let ago = 0; ago < YEAR_MONTHS; ago += 1) {
        const month = monthSavings({ ...input, month: addMonths(to, -ago) });
        kept += month.underBudgets;
        if (month.budgetsTotal > 0 && month.overNames.length === 0) {
            monthsUnder += 1;
        }
        if (month.drop !== null) {
            belowAverage += month.drop.amount;
            const earlier = dropped.get(month.drop.id)?.amount ?? 0;
            dropped.set(month.drop.id, { amount: earlier + month.drop.amount, name: month.drop.name });
        }
    }
    const belowNames = [...dropped.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, YEAR_NAMES)
        .map(({ name }) => name);
    return {
        belowAverage: roundMoney(belowAverage, decimals),
        belowNames,
        from,
        kept: roundMoney(kept, decimals),
        monthsUnder,
        to,
    };
}

import { effectiveLimit, rolloverCarryFrom } from "./budget-rollover";
import { spentForCategory, spentForMain } from "./budget-spent";
import type { ExpenseContribution } from "./budget-spent";
import { advanceBudgetWindow, shiftWindow, windowEndMs } from "./budget-window";
import type { BudgetWindow } from "./budget-window";
import { limitIn } from "./valuation";
import type { RateTable } from "./valuation";

export interface StoredBudget {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
    dateCreated: Date | null;
    rollover: boolean;
    startDate: Date | null;
    type: number;
}

export interface BudgetFigures {
    amount: number;
    carry: number;
    leftover: number;
    limit: number;
    overBudget: boolean;
    spent: number;
    window: BudgetWindow;
}

export interface FiguresOptions {
    displayCurrency: string;
    now: Date;
    periodOffset?: number;
    rates: RateTable;
    spent?: number;
}

export function overallBudgetFigures(
    budget: StoredBudget,
    rows: readonly ExpenseContribution[],
    options: FiguresOptions
): BudgetFigures {
    return figuresOf(budget, null, true, rows, options);
}

export function categoryBudgetFigures(
    budget: StoredBudget & { categoryId: string | null },
    rows: readonly ExpenseContribution[],
    options: FiguresOptions
): BudgetFigures {
    return figuresOf(budget, budget.categoryId, budget.categoryId !== null, rows, options);
}

function figuresOf(
    budget: StoredBudget,
    scope: string | null,
    counted: boolean,
    rows: readonly ExpenseContribution[],
    { displayCurrency, now, periodOffset = 0, rates, spent: viewedSpent }: FiguresOptions
): BudgetFigures {
    const current = advanceBudgetWindow(budget.startDate ?? now, budget.type, now);
    const window = shiftWindow(current.start, budget.type, periodOffset);
    const last = new Date(windowEndMs(window, now.getTime()));
    const limit = limitIn(budget, window.start, displayCurrency, rates);
    let spent = viewedSpent ?? 0;
    if (viewedSpent === undefined && counted) {
        spent =
            scope === null ? spentForMain(rows, window.start, last) : spentForCategory(rows, scope, window.start, last);
    }
    // Anchored on the viewed window, so stepping back to March shows what March inherited.
    const carry =
        budget.rollover && counted
            ? rolloverCarryFrom(rows, scope, {
                  anchor: budget.dateCreated ?? window.start,
                  current: window,
                  limit,
                  type: budget.type,
              }).credit
            : 0;
    const amount = effectiveLimit(limit, carry);
    return { amount, carry, leftover: amount - spent, limit, overBudget: spent > amount, spent, window };
}

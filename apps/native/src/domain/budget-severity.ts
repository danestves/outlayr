export interface BudgetSeverity {
    amount: number;
    overBudget: boolean;
    spent: number;
}

function overage(budget: BudgetSeverity): number {
    return budget.spent - budget.amount;
}

function spentFraction(budget: BudgetSeverity): number {
    return budget.amount > 0 ? budget.spent / budget.amount : 0;
}

/**
 * Equal severity returns 0 so the stable sort keeps oldest-first order. Kept out of `budgets.ts`, whose
 * expo-sqlite driver the node test runner cannot load.
 */
export function compareBudgetSeverity(a: BudgetSeverity, b: BudgetSeverity): number {
    if (a.overBudget !== b.overBudget) {
        return a.overBudget ? -1 : 1;
    }
    if (a.overBudget) {
        return overage(b) - overage(a);
    }
    return spentFraction(b) - spentFraction(a);
}

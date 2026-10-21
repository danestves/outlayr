import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";

export interface DominantCategory {
    categoryId: string;
    /** Share of the window's total spend, 0–1. */
    share: number;
}

/**
 * Rolls a subcategory up to its parent. Uncategorised spend counts in the total but is never the answer: it has
 * no name to put in the sentence.
 */
export function dominantCategory(
    contributions: readonly ExpenseContribution[],
    window: BudgetWindow,
    endMs: number
): DominantCategory | null {
    const startMs = window.start.getTime();
    const byCategory = new Map<string, number>();
    let total = 0;

    for (const row of contributions) {
        const at = row.date.getTime();
        if (at < startMs || at > endMs) {
            continue;
        }
        total += row.amount;
        const key = row.parentId ?? row.categoryId;
        if (key) {
            byCategory.set(key, (byCategory.get(key) ?? 0) + row.amount);
        }
    }

    if (total <= 0) {
        return null;
    }

    let top: DominantCategory | null = null;
    for (const [categoryId, amount] of byCategory) {
        if (!top || amount > top.share * total) {
            top = { categoryId, share: amount / total };
        }
    }
    return top;
}

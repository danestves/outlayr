import { roundMoney } from "@outlayr/money/round";

import { rebalance } from "./split";
import type { Allocation } from "./split";

export function openDraft(total: number, categoryId: string | null, decimals: number): Allocation[] {
    return [{ amount: roundMoney(total, decimals), categoryId }];
}

// Zero, not an even share, so adding a category never restates amounts the user already typed.
export function addPart(allocations: readonly Allocation[], categoryId: string | null): Allocation[] {
    return [...allocations.map((one) => ({ ...one })), { amount: 0, categoryId }];
}

export function removePart(allocations: readonly Allocation[], index: number, decimals: number): Allocation[] {
    if (index < 0 || index >= allocations.length) {
        return allocations.map((one) => ({ ...one }));
    }
    const next = allocations.filter((_, at) => at !== index).map((one) => ({ ...one }));
    const freed = allocations[index].amount;
    if (next.length === 0) {
        return next;
    }
    const last = next.length - 1;
    next[last] = { ...next[last], amount: roundMoney(next[last].amount + freed, decimals) };
    return next;
}

// The absorber is floored at zero and the draft may go unbalanced: `rebalance` does not clamp it, and a negative
// part is more confusing than the save refusing.
export function setPartAmount(
    total: number,
    allocations: readonly Allocation[],
    index: number,
    amount: number,
    decimals: number
): Allocation[] {
    return rebalance(total, allocations, index, amount, decimals).map((one) =>
        one.amount < 0 ? { ...one, amount: 0 } : one
    );
}

export function setPartCategory(
    allocations: readonly Allocation[],
    index: number,
    categoryId: string | null
): Allocation[] {
    return allocations.map((one, at) => (at === index ? { ...one, categoryId } : { ...one }));
}

// A single part is stored as no split, so `allocationsFor` keeps returning the implicit whole.
export function isRealSplit(allocations: readonly Allocation[]): boolean {
    return allocations.length > 1;
}

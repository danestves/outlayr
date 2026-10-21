// An entry with no explicit allocations has one implicit allocation: its whole amount to its own `categoryId`.
// Category-blind totals (day subtotals, currency buckets, period figures) read the entry's amount, never allocations.

import { roundMoney } from "@outlayr/money/round";

export interface Allocation {
    /** Unsigned: direction comes from `income`. */
    amount: number;
    categoryId: string | null;
}

export interface SplittableEntry {
    amount: number;
    categoryId: string | null;
    id: string;
}

export function allocationsFor(entry: SplittableEntry, explicit: readonly Allocation[]): Allocation[] {
    if (explicit.length === 0) {
        return [{ amount: entry.amount, categoryId: entry.categoryId }];
    }
    return explicit.map((allocation) => ({ ...allocation }));
}

// Signed: positive is under-allocated, negative over.
export function unallocated(total: number, allocations: readonly Allocation[], decimals: number): number {
    return roundMoney(total - allocations.reduce((sum, one) => sum + one.amount, 0), decimals);
}

export function isBalanced(total: number, allocations: readonly Allocation[], decimals: number): boolean {
    return allocations.length > 0 && unallocated(total, allocations, decimals) === 0;
}

// The last other allocation absorbs the difference because it is the furthest from where the user is typing.
export function rebalance(
    total: number,
    allocations: readonly Allocation[],
    index: number,
    amount: number,
    decimals: number
): Allocation[] {
    const next = allocations.map((allocation) => ({ ...allocation }));
    if (index < 0 || index >= next.length) {
        return next;
    }
    next[index] = { ...next[index], amount: roundMoney(Math.max(0, amount), decimals) };
    const absorber = next.length - 1 === index ? next.length - 2 : next.length - 1;
    if (absorber < 0) {
        return next;
    }
    const others = next.reduce((sum, one, at) => (at === absorber ? sum : sum + one.amount), 0);
    next[absorber] = { ...next[absorber], amount: roundMoney(total - others, decimals) };
    return next;
}

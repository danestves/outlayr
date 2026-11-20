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
    if (index < 0 || index >= allocations.length) {
        return allocations.map((allocation) => ({ ...allocation }));
    }
    const typed = allocations.map((one, at) =>
        at === index ? { ...one, amount: roundMoney(Math.max(0, amount), decimals) } : { ...one }
    );
    const absorber = typed.length - 1 === index ? typed.length - 2 : typed.length - 1;
    const others = typed.reduce((sum, one, at) => (at === absorber ? sum : sum + one.amount), 0);
    return typed.map((one, at) => (at === absorber ? { ...one, amount: roundMoney(total - others, decimals) } : one));
}

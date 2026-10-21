// A subcategory counts toward its parent's budget; a null `categoryId` is the overall budget.
export function contributesTo(row: ExpenseContribution, categoryId: string | null | undefined): boolean {
    if (categoryId == null) {
        return true;
    }
    return row.categoryId === categoryId || row.parentId === categoryId;
}

// The spent functions' bound is inclusive, so passing a window's own end counts a boundary-dated row in two windows.
export function lastMsBefore(end: Date): Date {
    return new Date(end.getTime() - 1);
}

/** Already filtered to non-deleted expenses dated on or before now. */
export interface ExpenseContribution {
    amount: number;
    categoryId: string | null;
    date: Date;
    parentId: string | null;
}

/** Inclusive: `[start, now]`. */
export function spentForCategory(
    rows: readonly ExpenseContribution[],
    categoryId: string,
    start: Date,
    now: Date
): number {
    const startMs = start.getTime();
    const nowMs = now.getTime();
    let total = 0;
    for (const row of rows) {
        const t = row.date.getTime();
        if (t < startMs || t > nowMs) {
            continue;
        }
        if (contributesTo(row, categoryId)) {
            total += row.amount;
        }
    }
    return total;
}

export function spentForMain(rows: readonly ExpenseContribution[], start: Date, now: Date): number {
    const startMs = start.getTime();
    const nowMs = now.getTime();
    let total = 0;
    for (const row of rows) {
        const t = row.date.getTime();
        if (t >= startMs && t <= nowMs) {
            total += row.amount;
        }
    }
    return total;
}

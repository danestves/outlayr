import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { previousPeriodStart } from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";

import { median } from "./stats";

const TYPICAL_LOOKBACK = 6;

export interface TypicalInput {
    current: BudgetWindow;
    since?: Date | null;
    /** What was spent in `[start, end)` of a closed window. */
    spentIn: (start: Date, end: Date) => number;
    type: number;
}

export interface TypicalSpend {
    /** Newest first, zeros included: a window with nothing spent did not go over. */
    readonly history: readonly number[];
    /**
     * Median of the windows that held spending, or null. Zeros are excluded: a category used two months in six
     * would read "typically $0", which is worse than saying nothing.
     */
    readonly typical: number | null;
}

/** Excludes the current window: it is still being spent in and would drag the median down. */
export function typicalSpend({ current, type, spentIn, since }: TypicalInput): TypicalSpend {
    const history = closedWindowsBefore({ current, since, type }).map((window) => spentIn(window.start, window.end));
    return { history, typical: typicalOf(history) };
}

export function windowsOver(history: readonly number[], limit: number): number {
    return history.reduce((count, spent) => (spent > limit ? count + 1 : count), 0);
}

export function typicalOf(history: readonly number[]): number | null {
    return median(history.filter((spent) => spent > 0));
}

export function closedWindowsBefore({
    current,
    type,
    count = TYPICAL_LOOKBACK,
    since,
}: {
    count?: number;
    current: BudgetWindow;
    since?: Date | null;
    type: number;
}): BudgetWindow[] {
    const windows: BudgetWindow[] = [];
    const floor = since?.getTime() ?? Number.NEGATIVE_INFINITY;
    let end = current.start;

    while (windows.length < count) {
        const start = previousPeriodStart(end, type);
        // A type whose period cannot step backwards would loop forever.
        if (start.getTime() >= end.getTime() || end.getTime() <= floor) {
            break;
        }
        windows.push({ end, start });
        end = start;
    }
    return windows;
}

export const EVERY_SCOPE = "*";

/**
 * One pass for every category; a subcategory's spend also lands under its parent, matching `contributesTo`.
 */
export function spendPerWindow(
    rows: readonly ExpenseContribution[],
    windows: readonly BudgetWindow[]
): Map<string, number[]> {
    const totals = new Map<string, number[]>();
    const add = (key: string, index: number, amount: number) => {
        let series = totals.get(key);
        if (!series) {
            series = Array.from({ length: windows.length }, () => 0);
            totals.set(key, series);
        }
        series[index] = (series[index] ?? 0) + amount;
    };

    for (const row of rows) {
        const at = row.date.getTime();
        for (const [index, window] of windows.entries()) {
            if (at < window.start.getTime() || at >= window.end.getTime()) {
                continue;
            }
            add(EVERY_SCOPE, index, row.amount);
            if (row.categoryId) {
                add(row.categoryId, index, row.amount);
            }
            if (row.parentId) {
                add(row.parentId, index, row.amount);
            }
            break;
        }
    }
    return totals;
}

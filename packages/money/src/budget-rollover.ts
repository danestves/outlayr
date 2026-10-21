import { contributesTo } from "./budget-spent";
import type { ExpenseContribution } from "./budget-spent";
import { previousPeriodStart } from "./budget-window";
import type { BudgetWindow } from "./budget-window";

// An anchor can predate the ledger by years, so the walk needs a ceiling; hitting it sets `clamped`.
export const MAX_CARRY_PERIODS = 120;

export interface RolloverCarry {
    clamped: boolean;
    /** Signed: negative is an overspend still being paid off. Both directions carry, or overspending is forgotten. */
    credit: number;
    periods: number;
}

export interface CarryInput {
    anchor: Date;
    current: BudgetWindow;
    limit: number;
    /** Half-open: `[start, end)`. */
    spentIn: (start: Date, end: Date) => number;
    type: number;
}

/** Newest first. */
export function carryWindows({ anchor, current, type }: Omit<CarryInput, "limit" | "spentIn">) {
    const windows: BudgetWindow[] = [];
    let end = current.start;
    while (windows.length < MAX_CARRY_PERIODS) {
        const start = previousPeriodStart(end, type);
        // A type whose period cannot step backwards would loop forever.
        if (start.getTime() >= end.getTime() || end.getTime() <= anchor.getTime()) {
            return { clamped: false, windows };
        }
        windows.push({ end, start });
        end = start;
    }
    return { clamped: true, windows };
}

// Only closed windows count: crediting the current window against itself would count its allowance twice.
export function rolloverCarry({ limit, spentIn, ...walk }: CarryInput): RolloverCarry {
    const { clamped, windows } = carryWindows(walk);
    let credit = 0;
    for (const { start, end } of windows) {
        credit += limit - spentIn(start, end);
    }
    return { clamped, credit, periods: windows.length };
}

// A null `categoryId` is the overall budget. Each window adds the same rows in the same order as `spentForCategory`
// or `spentForMain`, so the credit is identical to theirs.
export function rolloverCarryFrom(
    rows: readonly ExpenseContribution[],
    categoryId: string | null,
    input: Omit<CarryInput, "spentIn">
): RolloverCarry {
    const { windows } = carryWindows(input);
    const starts = windows.map(({ start }) => start.getTime());
    const sums = starts.map(() => 0);
    const newestEnd = windows[0]?.end.getTime() ?? Number.NEGATIVE_INFINITY;
    const oldestStart = starts.at(-1) ?? Number.POSITIVE_INFINITY;
    for (const row of rows) {
        const at = row.date.getTime();
        if (at < oldestStart || at >= newestEnd || !contributesTo(row, categoryId)) {
            continue;
        }
        const index = starts.findIndex((start) => at >= start);
        sums[index] = (sums[index] ?? 0) + row.amount;
    }
    const spentByStart = new Map(starts.map((start, index) => [start, sums[index] ?? 0]));
    return rolloverCarry({ ...input, spentIn: (start) => spentByStart.get(start.getTime()) ?? 0 });
}

// Floored at zero because every downstream figure reads a negative limit as nonsense; the debt stays in `credit`.
export function effectiveLimit(limit: number, carry: number): number {
    return Math.max(0, limit + carry);
}

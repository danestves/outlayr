import { contributesTo } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { startOfDay } from "@outlayr/money/calendar";

import { median } from "./stats";

const DAY_MS = 86_400_000;

/** Before a fifth of the window, a linear extrapolation is dominated by whichever charge landed first. */
const PROJECTION_FLOOR = 0.2;

export interface BurndownPoint {
    balance: number;
    day: number;
    spent: number;
}

export interface Burndown {
    points: BurndownPoint[];
    /** At the median elapsed daily rate; null when too little has elapsed to forecast honestly. */
    projectedBalance: number | null;
    runwayDate: Date | null;
    /** 1-indexed day the balance first went negative. */
    runwayDay: number | null;
    totalDays: number;
}

export interface BurndownOptions {
    categoryId?: string | null;
    limit: number;
    now: Date;
    window: BudgetWindow;
}

/** Rounding absorbs the ±1h of a DST boundary, which `floor(ms / DAY_MS)` would push into the next day. */
function dayOffset(date: Date, start: Date): number {
    return Math.round((startOfDay(date).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

/**
 * A typical purchase times how often purchases happen: a median over the zero-padded calendar is 0 for anyone
 * who shops on fewer than half the days, and the forecast would claim they never spend again.
 */
function dailyRate(perDay: readonly number[]): number {
    const spendDays = perDay.filter((amount) => amount > 0);
    if (spendDays.length === 0) {
        return 0;
    }
    return (median(spendDays) ?? 0) * (spendDays.length / perDay.length);
}

export function buildBurndown(rows: readonly ExpenseContribution[], options: BurndownOptions): Burndown {
    const { limit, window, now, categoryId = null } = options;

    const totalDays = Math.max(1, dayOffset(window.end, window.start));
    const elapsedDays = Math.min(totalDays, Math.max(1, dayOffset(now, window.start) + 1));

    const perDay: number[] = Array.from({ length: elapsedDays }, () => 0);
    const firstMs = startOfDay(window.start).getTime();
    const endMs = new Date(
        window.start.getFullYear(),
        window.start.getMonth(),
        window.start.getDate() + elapsedDays
    ).getTime();
    for (const row of rows) {
        const ms = row.date.getTime();
        if (ms < firstMs || ms >= endMs || !contributesTo(row, categoryId)) {
            continue;
        }
        perDay[dayOffset(row.date, window.start)] += row.amount;
    }

    const points: BurndownPoint[] = [];
    let runwayDay: number | null = null;
    let spent = 0;
    for (let index = 0; index < elapsedDays; index += 1) {
        spent += perDay[index];
        const balance = limit - spent;
        if (runwayDay === null && balance < 0) {
            runwayDay = index + 1;
        }
        points.push({ balance, day: index + 1, spent });
    }

    const elapsedFraction = elapsedDays / totalDays;
    const projectedBalance =
        elapsedFraction >= PROJECTION_FLOOR ? limit - spent - dailyRate(perDay) * (totalDays - elapsedDays) : null;

    return {
        points,
        projectedBalance,
        runwayDate:
            runwayDay === null
                ? null
                : new Date(
                      window.start.getFullYear(),
                      window.start.getMonth(),
                      window.start.getDate() + (runwayDay - 1)
                  ),
        runwayDay,
        totalDays,
    };
}

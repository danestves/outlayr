import { contributesTo } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { startOfDay } from "@outlayr/money/calendar";
import { median } from "@outlayr/money/stats";

const DAY_MS = 86_400_000;

const PROJECTION_FLOOR = 0.2;

export interface BurndownPoint {
    balance: number;
    day: number;
    spent: number;
}

export interface Burndown {
    points: BurndownPoint[];
    projectedBalance: number | null;
    runwayDate: Date | null;
    runwayDay: number | null;
    totalDays: number;
}

export interface BurndownOptions {
    categoryId?: string | null;
    limit: number;
    now: Date;
    window: BudgetWindow;
}

function dayOffset(date: Date, start: Date): number {
    return Math.round((startOfDay(date).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

function dailyRate(perDay: readonly number[]): number {
    const spendDays = perDay.filter((amount) => amount > 0);
    if (spendDays.length === 0) {
        return 0;
    }
    return (median(spendDays) ?? 0) * (spendDays.length / perDay.length);
}

function dayOf(start: Date, offset: number): Date {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
}

export function buildBurndown(rows: readonly ExpenseContribution[], options: BurndownOptions): Burndown {
    const { categoryId = null, limit, now, window } = options;
    const totalDays = Math.max(1, dayOffset(window.end, window.start));
    const elapsedDays = Math.min(totalDays, Math.max(1, dayOffset(now, window.start) + 1));
    const perDay = Array.from({ length: elapsedDays }, () => 0);
    const firstMs = startOfDay(window.start).getTime();
    const endMs = dayOf(window.start, elapsedDays).getTime();
    for (const row of rows) {
        const ms = row.date.getTime();
        if (ms >= firstMs && ms < endMs && contributesTo(row, categoryId)) {
            const offset = dayOffset(row.date, window.start);
            perDay[offset] = (perDay[offset] ?? 0) + row.amount;
        }
    }
    const points: BurndownPoint[] = [];
    let runwayDay: number | null = null;
    let spent = 0;
    for (const [index, amount] of perDay.entries()) {
        spent += amount;
        const balance = limit - spent;
        if (runwayDay === null && balance < 0) {
            runwayDay = index + 1;
        }
        points.push({ balance, day: index + 1, spent });
    }
    const projectedBalance =
        elapsedDays / totalDays >= PROJECTION_FLOOR
            ? limit - spent - dailyRate(perDay) * (totalDays - elapsedDays)
            : null;
    return {
        points,
        projectedBalance,
        runwayDate: runwayDay === null ? null : dayOf(window.start, runwayDay - 1),
        runwayDay,
        totalDays,
    };
}

import { addDays, DEFAULT_CALENDAR, monthPeriodStart, startOfDay, startOfWeek, startOfYear } from "./calendar";
import type { CalendarSettings } from "./calendar";
import { addMonths } from "./recurrence";

/** Mirrors the Swift `Budget.type` codes. */
export const BUDGET_TYPE = {
    day: 1,
    month: 3,
    week: 2,
    year: 4,
} as const;

export interface BudgetWindow {
    end: Date;
    start: Date;
}

export function periodEnd(start: Date, type: number): Date {
    switch (type) {
        case BUDGET_TYPE.day: {
            return addDays(start, 1);
        }
        case BUDGET_TYPE.week: {
            return addDays(start, 7);
        }
        case BUDGET_TYPE.month: {
            return addMonths(start, 1, start.getDate());
        }
        case BUDGET_TYPE.year: {
            return addMonths(start, 12, start.getDate());
        }
        default: {
            return new Date(start);
        }
    }
}

export function startOfPeriod(now: Date, type: number, calendar: CalendarSettings = DEFAULT_CALENDAR): Date {
    switch (type) {
        case BUDGET_TYPE.day: {
            return startOfDay(now);
        }
        case BUDGET_TYPE.week: {
            return startOfWeek(now, calendar.firstWeekday);
        }
        case BUDGET_TYPE.month: {
            return monthPeriodStart(now, calendar.firstDayOfMonth);
        }
        case BUDGET_TYPE.year: {
            return startOfYear(now);
        }
        default: {
            return startOfDay(now);
        }
    }
}

// The `end > start` guard stops an unknown or zero-length type from looping forever.
export function advanceBudgetWindow(startDate: Date, type: number, now: Date): BudgetWindow {
    let start = new Date(startDate);
    let end = periodEnd(start, type);
    while (end.getTime() <= now.getTime() && end.getTime() > start.getTime()) {
        start = end;
        end = periodEnd(start, type);
    }
    return { end, start };
}

export function previousPeriodStart(start: Date, type: number): Date {
    switch (type) {
        case BUDGET_TYPE.day: {
            return addDays(start, -1);
        }
        case BUDGET_TYPE.week: {
            return addDays(start, -7);
        }
        case BUDGET_TYPE.month: {
            return addMonths(start, -1, start.getDate());
        }
        case BUDGET_TYPE.year: {
            return addMonths(start, -12, start.getDate());
        }
        default: {
            return new Date(start);
        }
    }
}

export function shiftWindow(start: Date, type: number, offset: number): BudgetWindow {
    let cursor = new Date(start);
    for (let step = 0; step < Math.abs(offset); step += 1) {
        const next = offset < 0 ? previousPeriodStart(cursor, type) : periodEnd(cursor, type);
        if (next.getTime() === cursor.getTime()) {
            break;
        }
        cursor = next;
    }
    return { end: periodEnd(cursor, type), start: cursor };
}

/** 100 years of months, or three of days. */
const MAX_PERIODS_BACK = 1200;

// The oldest entry is the floor, not the budget's anchor: the anchor rolls forward.
export function periodsBackTo(currentStart: Date, type: number, earliest: Date | null): number {
    if (!earliest) {
        return 0;
    }
    let steps = 0;
    let start = currentStart;
    while (steps < MAX_PERIODS_BACK && start.getTime() > earliest.getTime()) {
        const previous = previousPeriodStart(start, type);
        if (previous.getTime() >= start.getTime()) {
            break;
        }
        start = previous;
        steps += 1;
    }
    return steps;
}

export function windowEndMs(window: BudgetWindow, nowMs: number): number {
    return Math.min(window.end.getTime() - 1, nowMs);
}

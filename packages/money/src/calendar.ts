/** `firstWeekday` is 1 = Sunday, 2 = Monday; `firstDayOfMonth` is 1–28. */
export interface CalendarSettings {
    firstDayOfMonth: number;
    firstWeekday: number;
}

/** Matches `SETTING_DEFAULTS`. */
export const DEFAULT_CALENDAR: CalendarSettings = {
    firstDayOfMonth: 1,
    firstWeekday: 1,
};

export function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function firstOfMonth(date: Date): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function startOfWeek(date: Date, firstWeekday = 1): Date {
    const d = startOfDay(date);
    const offset = (d.getDay() - (firstWeekday - 1) + 7) % 7;
    d.setDate(d.getDate() - offset);
    return d;
}

export function monthPeriodStart(date: Date, firstDayOfMonth = 1): Date {
    const anchor = Math.min(Math.max(1, firstDayOfMonth), 28);
    const start = startOfDay(date);
    if (start.getDate() < anchor) {
        start.setMonth(start.getMonth() - 1);
    }
    start.setDate(anchor);
    return start;
}

export function startOfYear(date: Date): Date {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Adds `n` days keeping local wall time (DST-tolerant, like Calendar `.day`). */
export function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

// No month-length clamping: insights only call this on a first-of-month anchor.
export function addMonths(date: Date, n: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
}

export function isFuture(date: Date, now: Date = new Date()): boolean {
    return date.getTime() > now.getTime();
}

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

// Goals compare against `useNow` and date pickers, which both cut on local midnight. `setHours`, not epoch
// arithmetic: flooring by the epoch gives a UTC day, and clock-shift days are 23 or 25 hours long.
export function startOfLocalDay(ms: number): number {
    const date = new Date(ms);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export function addLocalDays(ms: number, days: number): number {
    const date = new Date(ms);
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

// Clamped because `setMonth` rolls an impossible date forward: 31 August plus six months would land on 3 March.
export function addLocalMonths(ms: number, months: number): Date {
    const source = new Date(ms);
    const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(source.getDate(), lastDay));
    return target;
}

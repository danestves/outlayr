import { addLocalDays } from "@outlayr/money/calendar";

export { addLocalDays, addLocalMonths, startOfLocalDay } from "@outlayr/money/calendar";

/** The local day SQLite's `'localtime'` cuts (`LOCAL_DAY`). */
export function localDayKey(ms: number): string {
    const date = new Date(ms);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function tomorrowLocal(nowMs: number = Date.now()): Date {
    const date = new Date(nowMs);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
}

// Rounded, not divided: a span crossing a clock shift is not a whole number of 24-hour days.
export function daysBetween(fromMs: number, toMs: number): number {
    return Math.round((toMs - fromMs) / 86_400_000);
}

export interface PayDays {
    friday: Date;
    monthEnd: Date;
    tomorrow: Date;
}

const FRIDAY = 5;

export function payDays(nowMs: number): PayDays {
    const tomorrow = tomorrowLocal(nowMs);
    const friday = new Date(addLocalDays(tomorrow.getTime(), 1));
    while (friday.getDay() !== FRIDAY) {
        friday.setDate(friday.getDate() + 1);
    }
    const today = new Date(nowMs);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthEnd = thisMonthEnd > tomorrow ? thisMonthEnd : new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { friday, monthEnd, tomorrow };
}

// Material 3's picker shows the UTC day of its instant, so an evening entry west of Greenwich would open a day late.
export function utcPickerDay(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export function onUtcPickerDay(picked: Date, date: Date): Date {
    const next = new Date(date);
    next.setFullYear(picked.getUTCFullYear(), picked.getUTCMonth(), picked.getUTCDate());
    return next;
}

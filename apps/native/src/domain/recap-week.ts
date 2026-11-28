import { addDays, startOfWeek } from "@outlayr/money/calendar";

const WEEK_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function recapWeekKey(start: Date): string {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

export function previousWeek(now: Date, firstWeekday: number): Date {
    return addDays(startOfWeek(now, firstWeekday), -7);
}

export function recapWeek(key: string | undefined, now: Date, firstWeekday: number): Date {
    const match = key === undefined ? null : WEEK_KEY.exec(key);
    if (match === null) {
        return previousWeek(now, firstWeekday);
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    const currentStart = startOfWeek(now, firstWeekday);
    const invalid =
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month ||
        parsed.getDate() !== day;
    return invalid || parsed.getTime() >= currentStart.getTime()
        ? previousWeek(now, firstWeekday)
        : startOfWeek(parsed, firstWeekday);
}

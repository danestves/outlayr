import { addMonths, firstOfMonth } from "@outlayr/money/calendar";

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const ROW_DAYS = 7;

export function recapMonthKey(month: Date): string {
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

export function previousMonth(now: Date): Date {
    return addMonths(firstOfMonth(now), -1);
}

export function recapMonth(key: string | undefined, now: Date): Date {
    const match = key === undefined ? null : MONTH_KEY.exec(key);
    if (match === null) {
        return previousMonth(now);
    }
    const month = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return month.getTime() > firstOfMonth(now).getTime() || Number.isNaN(month.getTime()) ? previousMonth(now) : month;
}

export function recapRowVisible(now: Date): boolean {
    return now.getDate() <= ROW_DAYS;
}

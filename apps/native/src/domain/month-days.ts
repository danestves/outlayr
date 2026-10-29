import { addMonths, firstOfMonth } from "@outlayr/money/calendar";

import { addLocalDays, daysBetween, localDayKey } from "./local-day";

export function loggedDays(month: Date, moments: readonly number[]): boolean[] {
    const start = firstOfMonth(month).getTime();
    const keys = new Set(moments.map(localDayKey));
    const length = daysBetween(start, addMonths(new Date(start), 1).getTime());
    return Array.from({ length }, (_, offset) => keys.has(localDayKey(addLocalDays(start, offset))));
}

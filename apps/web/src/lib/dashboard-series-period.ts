import { monthWindow } from "@outlayr/backend/confect/mcpLedger";
import { utcDateString } from "@outlayr/money/dates";

import { addDays, daysBetween } from "./ledger";

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface Period {
    days: number;
    from: string;
    key: string;
    to: string;
}

export const isPeriodKey = (value: string) => PERIOD_KEY.test(value);

export function periodOf(key: string, firstDayOfMonth: number): Period {
    const { end, start } = monthWindow(Date.parse(`${key}-28T00:00:00Z`), 0, firstDayOfMonth, 0);
    const from = utcDateString(start);
    const to = utcDateString(end - 1);
    return { days: daysBetween(from, to) + 1, from, key, to };
}

export function periodKeyOf(day: string, firstDayOfMonth: number) {
    const { start } = monthWindow(Date.parse(`${day}T00:00:00Z`), 0, firstDayOfMonth, 0);
    return utcDateString(start).slice(0, 7);
}

export function shiftPeriodKey(key: string, months: number) {
    const [year = 0, month = 1] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 7);
}

export function daysFrom(from: string, to: string) {
    const count = Math.max(daysBetween(from, to) + 1, 0);
    return Array.from({ length: count }, (_, index) => addDays(from, index));
}

export function priorSlice(period: Period, today: string, firstDayOfMonth: number) {
    const prior = periodOf(shiftPeriodKey(period.key, -1), firstDayOfMonth);
    const elapsed = daysBetween(period.from, today) + 1;
    if (elapsed >= period.days) {
        return prior;
    }
    const to = addDays(prior.from, Math.max(elapsed, 0) - 1);
    return { ...prior, to: to < prior.to ? to : prior.to };
}

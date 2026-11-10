import { fixedOffset, monthWindow, wallMidnight } from "@outlayr/money/ledger-zone";

import { addDays, daysBetween } from "./ledger";

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const WALL_CLOCK = fixedOffset(0);

export interface Period {
    days: number;
    from: string;
    key: string;
    to: string;
}

export const isPeriodKey = (value: string) => PERIOD_KEY.test(value);

export function periodOf(key: string, firstDayOfMonth: number): Period {
    const { from, to } = monthWindow(wallMidnight(`${key}-28`), WALL_CLOCK, firstDayOfMonth, 0);
    return { days: daysBetween(from, to) + 1, from, key, to };
}

export function periodKeyOf(day: string, firstDayOfMonth: number) {
    return monthWindow(wallMidnight(day), WALL_CLOCK, firstDayOfMonth, 0).from.slice(0, 7);
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

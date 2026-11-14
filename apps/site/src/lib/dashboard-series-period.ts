import { fixedOffset, monthWindow, wallMidnight, wallNoon } from "@outlayr/money/ledger-zone";

import { addDays, daysBetween } from "./ledger";

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_KEY = /^\d{4}$/;
const WEEK_KEY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const WALL_CLOCK = fixedOffset(0);
const DAYS_IN_WEEK = 7;

export type PeriodKind = "month" | "week" | "year";

export interface Period {
    days: number;
    from: string;
    key: string;
    to: string;
}

export interface Calendar {
    firstDayOfMonth: number;
    firstWeekday: number;
}

export const isPeriodKey = (value: string) => PERIOD_KEY.test(value);

/** A key names its own span: `2026` a year, `2026-10` a month, `2026-10-25` the week opening that day. */
export function periodKindOf(key: string): PeriodKind | null {
    if (PERIOD_KEY.test(key)) {
        return "month";
    }
    if (YEAR_KEY.test(key)) {
        return "year";
    }
    return WEEK_KEY.test(key) && !Number.isNaN(wallNoon(key)) ? "week" : null;
}

function monthOf(key: string, firstDayOfMonth: number): Period {
    const { from, to } = monthWindow(wallMidnight(`${key}-28`), WALL_CLOCK, firstDayOfMonth, 0);
    return { days: daysBetween(from, to) + 1, from, key, to };
}

export function periodOf(key: string, firstDayOfMonth: number): Period {
    const kind = periodKindOf(key);
    if (kind === "week") {
        return { days: DAYS_IN_WEEK, from: key, key, to: addDays(key, DAYS_IN_WEEK - 1) };
    }
    if (kind === "year") {
        const { from } = monthOf(`${key}-01`, firstDayOfMonth);
        const { to } = monthOf(`${key}-12`, firstDayOfMonth);
        return { days: daysBetween(from, to) + 1, from, key, to };
    }
    return monthOf(key, firstDayOfMonth);
}

export function periodKeyOf(day: string, firstDayOfMonth: number) {
    return monthWindow(wallMidnight(day), WALL_CLOCK, firstDayOfMonth, 0).from.slice(0, 7);
}

/** `firstWeekday` is 1 for Sunday and 2 for Monday, as the ledger stores it. */
export function weekKeyOf(day: string, firstWeekday: number) {
    const weekday = new Date(wallNoon(day)).getUTCDay();
    return addDays(day, -((weekday - (firstWeekday - 1) + DAYS_IN_WEEK) % DAYS_IN_WEEK));
}

export function periodKeyIn(kind: PeriodKind, day: string, calendar: Calendar) {
    if (kind === "week") {
        return weekKeyOf(day, calendar.firstWeekday);
    }
    const month = periodKeyOf(day, calendar.firstDayOfMonth);
    return kind === "year" ? month.slice(0, 4) : month;
}

export function shiftPeriodKey(key: string, steps: number) {
    const kind = periodKindOf(key);
    if (kind === "week") {
        return addDays(key, steps * DAYS_IN_WEEK);
    }
    if (kind === "year") {
        return String(Number(key) + steps);
    }
    const [year = 0, month = 1] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1 + steps, 1)).toISOString().slice(0, 7);
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

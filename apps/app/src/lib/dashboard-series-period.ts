import { fixedOffset, monthWindow, wallMidnight, wallNoon } from "@outlayr/money/ledger-zone";

import { addDays, daysBetween } from "./ledger";

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_KEY = /^\d{4}$/;
const WEEK_KEY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const RANGE_KEY = /^(\d{4})-(0[1-9]|1[0-2])\/(quarter|year)$/;
const RANGE_MONTHS = { quarter: 3, year: 12 } as const;
const CUSTOM_KEY = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const LAST_DAYS = 30;
const WALL_CLOCK = fixedOffset(0);
const DAYS_IN_WEEK = 7;

export type PeriodKind = "month" | "week" | "year";

export type RangeKind = keyof typeof RANGE_MONTHS;

export const RANGE_PRESETS = ["today", "week", "30d", "all"] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

/** Two days, first and last, both counted: `2026-10-05..2026-10-18`. */
export type CustomKey = `${string}..${string}`;

export type RangeChoice = RangeKind | RangePreset | CustomKey;

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

export const rangeKeyOf = (month: string, kind: RangeKind | null) => (kind ? `${month}/${kind}` : month);

const isRangeKind = (value: string | undefined): value is RangeKind => value === "quarter" || value === "year";

function rangeParts(key: string) {
    const [, year, month, kind] = RANGE_KEY.exec(key) ?? [];
    return year && month && isRangeKind(kind) ? { kind, month: `${year}-${month}`, year } : null;
}

export const rangeKindOf = (key: string): RangeKind | null => rangeParts(key)?.kind ?? null;

const isDay = (value: string) => WEEK_KEY.test(value) && new Date(wallNoon(value)).toISOString().startsWith(value);

function customParts(key: string) {
    const [, from, to] = CUSTOM_KEY.exec(key) ?? [];
    return from && to && isDay(from) && isDay(to) && from <= to ? { from, to } : null;
}

export const customKeyOf = (from: string, to: string): CustomKey => `${from}..${to}`;

export const isCustomKey = (key: string): key is CustomKey => customParts(key) !== null;

const isPreset = (value: string): value is RangePreset => RANGE_PRESETS.some((preset) => preset === value);

export function rangeChoiceOf(value: string | undefined): RangeChoice | null {
    if (value === undefined) {
        return null;
    }
    return isRangeKind(value) || isPreset(value) || isCustomKey(value) ? value : null;
}

export interface Today {
    firstWeekday: number;
    today: string;
}

export function presetKeyOf(preset: RangePreset, { firstWeekday, today }: Today, earliest: string): CustomKey {
    switch (preset) {
        case "today": {
            return customKeyOf(today, today);
        }
        case "week": {
            const from = weekKeyOf(today, firstWeekday);
            return customKeyOf(from, addDays(from, DAYS_IN_WEEK - 1));
        }
        case "30d": {
            return customKeyOf(addDays(today, 1 - LAST_DAYS), today);
        }
        default: {
            return customKeyOf(earliest < today ? earliest : today, today);
        }
    }
}

export const lastMonthIn = (period: Pick<Period, "to">, firstDayOfMonth: number) =>
    periodKeyOf(period.to, firstDayOfMonth);

function monthOf(key: string, firstDayOfMonth: number): Period {
    const { from, to } = monthWindow(wallMidnight(`${key}-28`), WALL_CLOCK, firstDayOfMonth, 0);
    return { days: daysBetween(from, to) + 1, from, key, to };
}

export function periodOf(key: string, firstDayOfMonth: number): Period {
    const custom = customParts(key);
    if (custom) {
        return { days: daysBetween(custom.from, custom.to) + 1, ...custom, key };
    }
    const range = rangeParts(key);
    if (range) {
        const first =
            range.kind === "year" ? `${range.year}-01` : shiftPeriodKey(range.month, 1 - RANGE_MONTHS.quarter);
        const { from } = monthOf(first, firstDayOfMonth);
        const { to } = monthOf(range.month, firstDayOfMonth);
        return { days: daysBetween(from, to) + 1, from, key, to };
    }
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

// A quarter steps to the three months before it; a year to the same months a year earlier;
// a custom range to the same number of days next to it.
export function shiftPeriodKey(key: string, steps: number): string {
    const custom = customParts(key);
    if (custom) {
        const days = (daysBetween(custom.from, custom.to) + 1) * steps;
        return customKeyOf(addDays(custom.from, days), addDays(custom.to, days));
    }
    const range = rangeParts(key);
    if (range) {
        return rangeKeyOf(shiftPeriodKey(range.month, steps * RANGE_MONTHS[range.kind]), range.kind);
    }
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

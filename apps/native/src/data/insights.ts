import {
    addDays,
    addMonths,
    DEFAULT_CALENDAR,
    monthPeriodStart,
    startOfWeek,
    startOfYear,
} from "@outlayr/money/calendar";
import type { CalendarSettings } from "@outlayr/money/calendar";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import { and, eq, isNull, lte } from "drizzle-orm";

import { categories, transactions } from "@/db/schema";
import { monthAbbrev, monthAbbrevTitle, weekdayInitial } from "@/domain/dates";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";

import type { SpendDb } from "./budget-spent";
import { NO_VALUATION } from "./valuation-source";
import type { Valuation } from "./valuation-source";

export type InsightsPeriod = "week" | "month" | "year";

export type InsightsMeasure = "spent" | "income" | "net";

const FALLBACK_CATEGORY_COLOR = "#767676";

const DAY_MS = 86_400_000;

export { monthPeriodStart } from "@outlayr/money/calendar";

export type InsightsCalendar = CalendarSettings;

export const DEFAULT_INSIGHTS_CALENDAR: InsightsCalendar = DEFAULT_CALENDAR;

/** Already filtered to non-deleted rows dated on or before now. */
export interface InsightsContribution {
    amount: number;
    categoryId: string | null;
    date: Date;
    income: boolean;
    parentId: string | null;
}

export interface CategoryMeta {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    id: string;
    income: boolean;
    name: string | null;
    parentId: string | null;
}

export interface InsightsBucket {
    /** Exclusive. */
    end: Date;
    label: string;
    start: Date;
    /** Signed for `net` (income − expense); a positive magnitude otherwise. */
    value: number;
}

interface BucketRange {
    end: Date;
    label: string;
    start: Date;
}

// Calendar-anchored, not trailing: a week from `firstWeekday`, a month from `firstDayOfMonth`, a year from January.
export function windowStart(
    period: InsightsPeriod,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): Date {
    if (period === "week") {
        return addDays(startOfWeek(now, calendar.firstWeekday), offset * 7);
    }
    if (period === "month") {
        return addMonths(monthPeriodStart(now, calendar.firstDayOfMonth), offset);
    }
    const start = startOfYear(now);
    start.setFullYear(start.getFullYear() + offset);
    return start;
}

/** Exclusive. */
export function windowEnd(
    period: InsightsPeriod,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): Date {
    return windowStart(period, now, offset + 1, calendar);
}

// Every slot is present even when still in the future: the chart dims those rather than omitting them.
export function bucketRanges(
    period: InsightsPeriod,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR,
    language: Language = runtimeLanguage()
): BucketRange[] {
    const start = windowStart(period, now, offset, calendar);
    const ranges: BucketRange[] = [];
    if (period === "year") {
        for (let i = 0; i < 12; i += 1) {
            const slot = addMonths(start, i);
            ranges.push({
                end: addMonths(slot, 1),
                label: monthAbbrev(slot, language),
                start: slot,
            });
        }
        return ranges;
    }
    const end = windowEnd(period, now, offset, calendar);
    const slots = period === "week" ? 7 : Math.round((end.getTime() - start.getTime()) / DAY_MS);
    for (let i = 0; i < slots; i += 1) {
        const slot = addDays(start, i);
        ranges.push({
            end: addDays(slot, 1),
            label: period === "week" ? weekdayInitial(slot, language) : String(slot.getDate()),
            start: slot,
        });
    }
    return ranges;
}

export function elapsedSlots(
    period: InsightsPeriod,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): number {
    const ranges = bucketRanges(period, now, offset, calendar);
    if (ranges.length === 0) {
        return 1;
    }
    const nowMs = now.getTime();
    const elapsed = ranges.filter((range) => range.start.getTime() <= nowMs).length;
    return Math.max(1, Math.min(ranges.length, elapsed));
}

function measureValue(income: boolean, amount: number, measure: InsightsMeasure): number {
    switch (measure) {
        case "spent": {
            return income ? 0 : amount;
        }
        case "income": {
            return income ? amount : 0;
        }
        default: {
            return income ? amount : -amount;
        }
    }
}

export function bucketSeries(
    rows: readonly InsightsContribution[],
    period: InsightsPeriod,
    measure: InsightsMeasure,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR,
    language: Language = runtimeLanguage()
): InsightsBucket[] {
    const nowMs = now.getTime();
    const buckets: InsightsBucket[] = bucketRanges(period, now, offset, calendar, language).map((r) => ({
        ...r,
        value: 0,
    }));
    const last = buckets.at(-1);
    if (!last) {
        return buckets;
    }
    const start = buckets[0].start.getTime();
    const end = last.end.getTime();
    for (const row of rows) {
        const t = row.date.getTime();
        if (t > nowMs || t < start || t >= end) {
            continue;
        }
        const value = measureValue(row.income, row.amount, measure);
        if (value === 0) {
            continue;
        }
        for (const bucket of buckets) {
            if (t >= bucket.start.getTime() && t < bucket.end.getTime()) {
                bucket.value += value;
                break;
            }
        }
    }
    return buckets;
}

export function runningTotals(buckets: readonly InsightsBucket[]): number[] {
    const totals: number[] = [];
    let carried = 0;
    for (const bucket of buckets) {
        carried += bucket.value;
        totals.push(carried);
    }
    return totals;
}

export function periodTotal(buckets: readonly InsightsBucket[]): number {
    return buckets.reduce((total, bucket) => total + bucket.value, 0);
}

function windowBounds(
    period: InsightsPeriod,
    now: Date,
    offset: number,
    calendar: InsightsCalendar
): { start: number; end: number } | null {
    const ranges = bucketRanges(period, now, offset, calendar);
    const last = ranges.at(-1);
    if (!last) {
        return null;
    }
    return {
        end: last.end.getTime(),
        start: ranges[0].start.getTime(),
    };
}

/** `income` reads inflows; `spent` and `net` both read the outflow composition. */
export function categoryBreakdown(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): CategoryBreakdownEntry[] {
    const bounds = windowBounds(period, now, offset, calendar);
    if (!bounds) {
        return [];
    }
    return categoryBreakdownWithin(rows, categoriesById, measure, bounds, now);
}

export function categoryBreakdownWithin(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    measure: InsightsMeasure,
    bounds: { start: number; end: number },
    now: Date
): CategoryBreakdownEntry[] {
    const wantIncome = measure === "income";
    const nowMs = now.getTime();
    const sums = new Map<string, number>();
    for (const row of rows) {
        if (row.income !== wantIncome) {
            continue;
        }
        const t = row.date.getTime();
        if (t > nowMs || t < bounds.start || t >= bounds.end) {
            continue;
        }
        const topId = row.parentId ?? row.categoryId;
        if (topId == null) {
            continue;
        }
        sums.set(topId, (sums.get(topId) ?? 0) + row.amount);
    }
    let total = 0;
    for (const amount of sums.values()) {
        total += amount;
    }
    const entries: CategoryBreakdownEntry[] = [];
    for (const [id, amount] of sums) {
        const meta = categoriesById.get(id);
        entries.push({
            amount,
            color: meta?.color ?? FALLBACK_CATEGORY_COLOR,
            delta: null,
            emoji: meta?.emoji ?? null,
            fraction: total > 0 ? amount / total : 0,
            icon: meta?.icon ?? null,
            id,
            name: meta?.name ?? "Uncategorized",
        });
    }
    entries.sort((a, b) => b.amount - a.amount);
    return entries;
}

export interface CategoryBreakdownEntry {
    amount: number;
    color: string;
    /** Fraction of the prior window's amount, null with none. Filled by {@link withCategoryDeltas}. */
    delta: number | null;
    emoji: string | null;
    fraction: number;
    icon: string | null;
    id: string;
    name: string;
}

export function withCategoryDeltas(
    current: readonly CategoryBreakdownEntry[],
    prior: readonly CategoryBreakdownEntry[]
): CategoryBreakdownEntry[] {
    const priorById = new Map(prior.map((entry) => [entry.id, entry.amount]));
    return current.map((entry) => {
        const before = priorById.get(entry.id);
        return {
            ...entry,
            delta: before != null && before > 0 ? (entry.amount - before) / before : null,
        };
    });
}

export interface CategoryMover {
    color: string;
    /** Signed, in currency: positive means more flowed this window. */
    delta: number;
    emoji: string | null;
    fraction: number | null;
    icon: string | null;
    id: string;
    name: string;
}

const MOVER_MIN_SHARE = 0.05;
const MOVER_LIMIT = 3;

/** Ranked and gated on currency, not percentage. */
export function categoryMovers(
    current: readonly CategoryBreakdownEntry[],
    prior: readonly CategoryBreakdownEntry[],
    windowTotal: number
): CategoryMover[] {
    if (prior.length === 0 || windowTotal <= 0) {
        return [];
    }

    const floor = windowTotal * MOVER_MIN_SHARE;
    const priorById = new Map(prior.map((entry) => [entry.id, entry]));
    const movers: CategoryMover[] = [];

    for (const entry of current) {
        const before = priorById.get(entry.id);
        const delta = entry.amount - (before?.amount ?? 0);
        if (Math.abs(delta) < floor) {
            continue;
        }
        movers.push({
            color: entry.color,
            delta,
            emoji: entry.emoji,
            fraction: before != null && before.amount > 0 ? delta / before.amount : null,
            icon: entry.icon,
            id: entry.id,
            name: entry.name,
        });
    }

    const currentIds = new Set(current.map((entry) => entry.id));
    for (const entry of prior) {
        if (currentIds.has(entry.id) || entry.amount < floor) {
            continue;
        }
        movers.push({
            color: entry.color,
            delta: -entry.amount,
            emoji: entry.emoji,
            fraction: -1,
            icon: entry.icon,
            id: entry.id,
            name: entry.name,
        });
    }

    movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return movers.slice(0, MOVER_LIMIT);
}

export interface WindowTotals {
    income: number;
    spent: number;
}

export function windowTotals(
    rows: readonly InsightsContribution[],
    period: InsightsPeriod,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): WindowTotals {
    const bounds = windowBounds(period, now, offset, calendar);
    if (!bounds) {
        return { income: 0, spent: 0 };
    }
    const nowMs = now.getTime();
    let income = 0;
    let spent = 0;
    for (const row of rows) {
        const t = row.date.getTime();
        if (t > nowMs || t < bounds.start || t >= bounds.end) {
            continue;
        }
        if (row.income) {
            income += row.amount;
        } else {
            spent += row.amount;
        }
    }
    return { income, spent };
}

// Includes a "Direct" entry keyed on `parentId` for rows filed on the parent itself.
export function subcategoryBreakdown(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    parentId: string,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    now: Date,
    offset = 0,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): CategoryBreakdownEntry[] {
    const bounds = windowBounds(period, now, offset, calendar);
    if (!bounds) {
        return [];
    }
    return subcategoryBreakdownWithin(rows, categoriesById, parentId, measure, bounds, now);
}

function subcategorySums(
    rows: readonly InsightsContribution[],
    parentId: string,
    wantIncome: boolean,
    bounds: { start: number; end: number },
    nowMs: number
): Map<string, number> {
    const sums = new Map<string, number>();
    for (const row of rows) {
        if (row.income !== wantIncome) {
            continue;
        }
        const t = row.date.getTime();
        if (t > nowMs || t < bounds.start || t >= bounds.end) {
            continue;
        }
        if ((row.parentId ?? row.categoryId) !== parentId) {
            continue;
        }
        const key = row.categoryId ?? parentId;
        sums.set(key, (sums.get(key) ?? 0) + row.amount);
    }
    return sums;
}

export function subcategoryBreakdownWithin(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    parentId: string,
    measure: InsightsMeasure,
    bounds: { start: number; end: number },
    now: Date
): CategoryBreakdownEntry[] {
    const sums = subcategorySums(rows, parentId, measure === "income", bounds, now.getTime());
    let total = 0;
    for (const amount of sums.values()) {
        total += amount;
    }
    const parentMeta = categoriesById.get(parentId);
    const entries: CategoryBreakdownEntry[] = [];
    for (const [key, amount] of sums) {
        const direct = key === parentId;
        const meta = categoriesById.get(key);
        entries.push({
            amount,
            color: (direct ? parentMeta?.color : meta?.color) ?? FALLBACK_CATEGORY_COLOR,
            delta: null,
            emoji: (direct ? parentMeta?.emoji : meta?.emoji) ?? null,
            fraction: total > 0 ? amount / total : 0,
            icon: (direct ? parentMeta?.icon : meta?.icon) ?? null,
            id: key,
            name: direct ? "Direct" : (meta?.name ?? "Uncategorized"),
        });
    }
    entries.sort((a, b) => b.amount - a.amount);
    return entries;
}

/** 0 is the current window; negative offsets are the past. */
export function offsetForDate(
    period: InsightsPeriod,
    target: Date,
    now: Date,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR
): number {
    if (period === "week") {
        const from = startOfWeek(now, calendar.firstWeekday).getTime();
        const to = startOfWeek(target, calendar.firstWeekday).getTime();
        return Math.round((to - from) / (7 * DAY_MS));
    }
    if (period === "month") {
        const from = monthPeriodStart(now, calendar.firstDayOfMonth);
        const to = monthPeriodStart(target, calendar.firstDayOfMonth);
        return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    }
    return target.getFullYear() - now.getFullYear();
}

function dayMonth(date: Date, language: Language): string {
    return `${date.getDate()} ${monthAbbrevTitle(date, language)}`;
}

export function windowLabel(
    period: InsightsPeriod,
    offset: number,
    now: Date,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR,
    language: Language = runtimeLanguage()
): string {
    const start = windowStart(period, now, offset, calendar);
    if (period === "week") {
        const end = addDays(start, 6);
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${dayMonth(end, language)}`;
        }
        return `${dayMonth(start, language)} - ${dayMonth(end, language)}`;
    }
    if (period === "month") {
        if (calendar.firstDayOfMonth === 1) {
            return `${monthAbbrevTitle(start, language)} ${start.getFullYear()}`;
        }
        return `${dayMonth(start, language)} - ${dayMonth(addDays(windowEnd(period, now, offset, calendar), -1), language)}`;
    }
    return String(start.getFullYear());
}

export function windowShortLabel(
    period: InsightsPeriod,
    offset: number,
    now: Date,
    calendar: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR,
    language: Language = runtimeLanguage()
): string {
    const start = windowStart(period, now, offset, calendar);
    if (period === "week") {
        return dayMonth(start, language);
    }
    if (period === "month") {
        return `${monthAbbrevTitle(start, language)} ${String(start.getFullYear()).slice(-2)}`;
    }
    return String(start.getFullYear());
}

export function bucketDateLabel(period: InsightsPeriod, date: Date, language: Language = runtimeLanguage()): string {
    if (period === "year") {
        return `${monthAbbrevTitle(date, language)} ${date.getFullYear()}`;
    }
    return `${dayMonth(date, language)} ${date.getFullYear()}`;
}

// The reactive hook builds this same query itself and this async form feeds the tests, so keep them in step. Only this
// form carries `id`, which the widgets look an entry's valued figure up by.
export async function loadContributions(
    db: SpendDb,
    now: Date,
    valuation: Valuation = NO_VALUATION
): Promise<(InsightsContribution & { id: string })[]> {
    const rows = await db
        .select({
            amount: transactions.amount,
            amountUsd: transactions.amountUsd,
            categoryId: transactions.categoryId,
            currency: transactions.currency,
            date: transactions.date,
            exchangeRate: transactions.exchangeRate,
            exchangeRateType: transactions.exchangeRateType,
            id: transactions.id,
            income: transactions.income,
            parentId: categories.parentId,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(isNull(transactions.deletedAt), lte(transactions.date, now)));
    const valued = valueDatedRowsIn(rows, valuation.displayCurrency, valuation.rates);
    return rows.map((row, index) => ({
        // `amount` is the valued amount from here down, not the row's stored one.
        amount: valued[index],
        categoryId: row.categoryId,
        date: row.date,
        id: row.id,
        income: row.income,
        parentId: row.parentId ?? null,
    }));
}

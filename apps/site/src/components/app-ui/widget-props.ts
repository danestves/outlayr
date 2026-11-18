import { addDays, addMonths, firstOfMonth, startOfDay, startOfWeek, startOfYear } from "@outlayr/money/calendar";
import { roundMoney } from "@outlayr/money/round";
import type { Locale } from "@outlayr/shared/i18n";

import { DEEP_LINKS } from "../../../../native/src/lib/deep-links";
import { WIDGET_PALETTE } from "../../../../native/src/widgets/palette";
import type { WidgetPalette } from "../../../../native/src/widgets/palette";
import { formatDayTitle } from "./dates";
import { budgetPace, categoryStyle, imageColor, ROWS } from "./ledger";
import type { DemoRow } from "./ledger";
import { amountParts, currencyFor, formatAmount, formatFixed, symbolPrefix } from "./money";
import { appTranslator } from "./strings";
import type { AppKey, AppT } from "./strings";

export type WidgetChrome = Record<"light" | "dark", WidgetPalette>;

export interface BudgetViewProps {
    elapsedFraction: number;
    endsAt: number;
    isOverall: boolean;
    limit: string;
    name: string;
    over: boolean;
    percent: string;
    periodLabel: string;
    present: boolean;
    rangeLabel: string;
    remaining: string;
    remainingCaption: string;
    spent: string;
    spentFraction: number;
    url: string;
}

export interface LedgerEntryProps {
    amount: string;
    color: string;
    day: string;
    emoji: string;
    id: string;
    income: boolean;
    note: string;
}

export type InsightsPeriod = "week" | "month" | "year";
export type LedgerHeaderPeriod = "today" | InsightsPeriod;
export type LedgerHeaderMeasure = "spent" | "income" | "net";

export interface LedgerHeaderProps {
    amount: string;
    label: string;
    positive: boolean;
}

export interface LedgerWidgetProps {
    chrome: WidgetChrome;
    entries: LedgerEntryProps[];
    headers: Record<LedgerHeaderPeriod, Record<LedgerHeaderMeasure, LedgerHeaderProps>>;
    url: string;
}

export interface InsightsViewProps {
    bars: { x: string; y: number }[];
    income: string;
    net: string;
    netPositive: boolean;
    periodLabel: string;
    rangeLabel: string;
    slices: { name: string; color: string; amount: string; fraction: number }[];
    spent: string;
    url: string;
}

export interface LogWidgetProps {
    chrome: WidgetChrome;
    todayCount: number;
    todayLabel: string;
    todaySpent: string;
    url: string;
}

const LEDGER_LIMIT = 8;
const SLICE_LIMIT = 4;
const SUNDAY = 1;

const MONTH_KEYS = [
    "dates.month.0",
    "dates.month.1",
    "dates.month.2",
    "dates.month.3",
    "dates.month.4",
    "dates.month.5",
    "dates.month.6",
    "dates.month.7",
    "dates.month.8",
    "dates.month.9",
    "dates.month.10",
    "dates.month.11",
] as const satisfies readonly AppKey[];

const WEEKDAY_INITIALS = [
    "dates.weekdayInitial.0",
    "dates.weekdayInitial.1",
    "dates.weekdayInitial.2",
    "dates.weekdayInitial.3",
    "dates.weekdayInitial.4",
    "dates.weekdayInitial.5",
    "dates.weekdayInitial.6",
] as const satisfies readonly AppKey[];

const PERIOD_EYEBROW = {
    month: "insights.quiet.thisMonth",
    week: "insights.quiet.thisWeek",
    year: "insights.quiet.thisYear",
} as const satisfies Record<InsightsPeriod, AppKey>;

const PERIOD_HEADER = {
    month: "insights.period.month",
    week: "insights.period.week",
    year: "insights.period.year",
} as const satisfies Record<InsightsPeriod, AppKey>;

const PRESET_LABELS = {
    "Dining Out": "categories.preset.diningOut",
    Entertainment: "categories.preset.entertainment",
    Freelance: "categories.preset.freelance",
    Fuel: "categories.preset.fuel",
    Groceries: "categories.preset.groceries",
    Paycheck: "categories.preset.paycheck",
    "Phone & Internet": "categories.preset.phoneInternet",
    Rent: "categories.preset.rent",
    Shopping: "categories.preset.shopping",
    Subscriptions: "categories.preset.subscriptions",
    Transport: "categories.preset.transport",
    Utilities: "categories.preset.utilities",
} as const satisfies Partial<Record<DemoRow["category"], AppKey>>;

const hasPresetLabel = (name: DemoRow["category"]): name is keyof typeof PRESET_LABELS => name in PRESET_LABELS;

const dayOfMonth = (date: Date, locale: Locale) => (locale === "de" ? `${date.getDate()}.` : String(date.getDate()));

const monthAbbrevTitle = (date: Date, t: AppT) => t(MONTH_KEYS[date.getMonth()] ?? "dates.month.0");

export const formatUpcomingDate = (date: Date, locale: Locale, t: AppT) =>
    `${dayOfMonth(date, locale)} ${monthAbbrevTitle(date, t).toUpperCase()}`;

export const dayMonth = (date: Date, locale: Locale, t: AppT) =>
    `${dayOfMonth(date, locale)} ${monthAbbrevTitle(date, t)}`;

const clamp01 = (value: number) => (!Number.isFinite(value) || value < 0 ? 0 : Math.min(1, value));

function wholeAmount(amount: number, code: string, locale: Locale): string {
    const rounded = roundMoney(Math.abs(amount), 0);
    if (rounded === 0 && amount !== 0) {
        return formatAmount(amount, code, locale);
    }
    return `${symbolPrefix(amountParts(amount, code, locale).symbol)}${formatFixed(rounded, 0, locale)}`;
}

export const settled = (now: Date) => ROWS.filter((row) => row.date.getTime() <= now.getTime());

function sumBetween(start: Date, now: Date, income: boolean): number {
    return settled(now)
        .filter((row) => row.income === income && row.date.getTime() >= start.getTime())
        .reduce((sum, row) => sum + row.amount, 0);
}

function windowStart(period: InsightsPeriod, now: Date): Date {
    if (period === "week") {
        return startOfWeek(now, SUNDAY);
    }
    return period === "month" ? firstOfMonth(now) : startOfYear(now);
}

function windowEnd(period: InsightsPeriod, now: Date): Date {
    const start = windowStart(period, now);
    if (period === "week") {
        return addDays(start, 7);
    }
    return addMonths(start, period === "month" ? 1 : 12);
}

interface Bucket {
    end: Date;
    label: string;
    start: Date;
    value: number;
}

function buckets(period: InsightsPeriod, now: Date, t: AppT): Bucket[] {
    const start = windowStart(period, now);
    if (period === "year") {
        return Array.from({ length: 12 }, (_, index) => {
            const slot = addMonths(start, index);
            return { end: addMonths(slot, 1), label: monthAbbrevTitle(slot, t).toUpperCase(), start: slot, value: 0 };
        });
    }
    const days = Math.round((windowEnd(period, now).getTime() - start.getTime()) / 86_400_000);
    return Array.from({ length: period === "week" ? 7 : days }, (_, index) => {
        const slot = addDays(start, index);
        const label =
            period === "week" ? t(WEEKDAY_INITIALS[slot.getDay()] ?? "dates.weekdayInitial.0") : String(slot.getDate());
        return { end: addDays(slot, 1), label, start: slot, value: 0 };
    });
}

interface WindowAggregate {
    buckets: Bucket[];
    categories: { amount: number; category: DemoRow["category"]; fraction: number }[];
    income: number;
    spent: number;
}

function aggregate(period: InsightsPeriod, now: Date, t: AppT): WindowAggregate {
    const slots = buckets(period, now, t);
    const start = slots[0]?.start.getTime() ?? 0;
    const end = slots.at(-1)?.end.getTime() ?? start;
    const sums = new Map<DemoRow["category"], number>();
    let income = 0;
    let spent = 0;
    for (const row of settled(now)) {
        const at = row.date.getTime();
        if (at < start || at >= end) {
            continue;
        }
        if (row.income) {
            income += row.amount;
            continue;
        }
        spent += row.amount;
        const slot = slots.find((bucket) => at >= bucket.start.getTime() && at < bucket.end.getTime());
        if (slot) {
            slot.value += row.amount;
        }
        sums.set(row.category, (sums.get(row.category) ?? 0) + row.amount);
    }
    const total = [...sums.values()].reduce((sum, amount) => sum + amount, 0);
    const categories = [...sums]
        .map(([category, amount]) => ({ amount, category, fraction: total > 0 ? amount / total : 0 }))
        .toSorted((a, b) => b.amount - a.amount);
    return { buckets: slots, categories, income, spent };
}

function windowLabel(period: InsightsPeriod, now: Date, locale: Locale, t: AppT): string {
    const start = windowStart(period, now);
    if (period === "week") {
        const end = addDays(start, 6);
        return start.getMonth() === end.getMonth()
            ? `${dayOfMonth(start, locale)} - ${dayMonth(end, locale, t)}`
            : `${dayMonth(start, locale, t)} - ${dayMonth(end, locale, t)}`;
    }
    return period === "month" ? `${monthAbbrevTitle(start, t)} ${start.getFullYear()}` : String(start.getFullYear());
}

export const categoryName = (category: DemoRow["category"], t: AppT) =>
    hasPresetLabel(category) ? t(PRESET_LABELS[category]) : category;

export function logWidgetProps(now: Date, locale: Locale): LogWidgetProps {
    const today = startOfDay(now);
    return {
        chrome: WIDGET_PALETTE,
        todayCount: settled(now).filter((row) => !row.income && row.date.getTime() >= today.getTime()).length,
        todayLabel: appTranslator(locale)("common.today").toUpperCase(),
        todaySpent: formatAmount(sumBetween(today, now, false), currencyFor(locale), locale),
        url: DEEP_LINKS.newExpense,
    };
}

export function overallBudgetView(now: Date, locale: Locale): BudgetViewProps {
    const t = appTranslator(locale);
    const code = currencyFor(locale);
    const { left, limit, spent } = budgetPace(now);
    const start = firstOfMonth(now);
    const end = addMonths(start, 1);
    const last = new Date(end.getTime() - 1);
    const span = end.getTime() - start.getTime();
    const fraction = limit > 0 ? spent / limit : 0;
    const over = left < 0;
    return {
        elapsedFraction: clamp01((now.getTime() - start.getTime()) / span),
        endsAt: end.getTime(),
        isOverall: true,
        limit: wholeAmount(limit, code, locale),
        name: t("budgets.scope.everything"),
        over,
        percent: `${Math.round(fraction * 100)}%`,
        periodLabel: t("budgets.period.month").toUpperCase(),
        present: true,
        rangeLabel: `${dayOfMonth(start, locale)} – ${formatUpcomingDate(last, locale, t)}`,
        remaining: formatAmount(Math.abs(left), code, locale),
        remainingCaption: t(over ? "budgets.suffix.over" : "budgets.suffix.left").toUpperCase(),
        spent: wholeAmount(spent, code, locale),
        spentFraction: clamp01(fraction),
        url: DEEP_LINKS.overallBudget,
    };
}

export type EntryColor = "stored" | "unset";

export function ledgerWidgetProps(now: Date, locale: Locale, color: EntryColor = "stored"): LedgerWidgetProps {
    const t = appTranslator(locale);
    const code = currencyFor(locale);
    const money = (value: number) => formatAmount(value, code, locale);
    const measures = (label: string, income: number, spent: number) => {
        const net = income - spent;
        return {
            income: { amount: money(income), label, positive: true },
            net: { amount: money(Math.abs(net)), label, positive: net >= 0 },
            spent: { amount: money(spent), label, positive: false },
        } satisfies Record<LedgerHeaderMeasure, LedgerHeaderProps>;
    };
    const window = (period: InsightsPeriod) => {
        const totals = aggregate(period, now, t);
        return measures(t(PERIOD_HEADER[period]).toUpperCase(), totals.income, totals.spent);
    };
    const today = startOfDay(now);
    const entries = settled(now)
        .toReversed()
        .toSorted((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, LEDGER_LIMIT)
        .map((row) => ({
            amount: money(row.amount),
            color: color === "unset" ? "" : (imageColor(row.logo) ?? categoryStyle(row.category).color),
            day: formatDayTitle(row.date, now, locale, t),
            emoji: "",
            id: row.id,
            income: row.income,
            note: row.note,
        }));
    return {
        chrome: WIDGET_PALETTE,
        entries,
        headers: {
            month: window("month"),
            today: measures(
                t("common.today").toUpperCase(),
                sumBetween(today, now, true),
                sumBetween(today, now, false)
            ),
            week: window("week"),
            year: window("year"),
        },
        url: DEEP_LINKS.log,
    };
}

export function insightsView(period: InsightsPeriod, now: Date, locale: Locale): InsightsViewProps {
    const t = appTranslator(locale);
    const code = currencyFor(locale);
    const money = (value: number) => formatAmount(value, code, locale);
    const totals = aggregate(period, now, t);
    const net = totals.income - totals.spent;
    return {
        bars: totals.buckets.map((bucket) => ({ x: bucket.label, y: bucket.value })),
        income: money(totals.income),
        net: money(Math.abs(net)),
        netPositive: net >= 0,
        periodLabel: t(PERIOD_EYEBROW[period]).toUpperCase(),
        rangeLabel: windowLabel(period, now, locale, t),
        slices: totals.categories.slice(0, SLICE_LIMIT).map((slice) => ({
            amount: money(slice.amount),
            color: categoryStyle(slice.category).color,
            fraction: slice.fraction,
            name: categoryName(slice.category, t),
        })),
        spent: money(totals.spent),
        url: DEEP_LINKS.insights,
    };
}

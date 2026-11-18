import { CANONICAL_CATEGORY_NAMES } from "@outlayr/money/contract";
import type { Locale } from "@outlayr/shared/i18n";

import { formatDateHeader } from "./dates";
import { categoryStyle, imageColor } from "./ledger";
import type { DemoRow } from "./ledger";
import { amountParts, currencyFor, formatAmount, formatFixed } from "./money";
import { appTranslator } from "./strings";
import { categoryName, formatUpcomingDate, logWidgetProps, overallBudgetView, settled } from "./widget-props";
import type { BudgetViewProps } from "./widget-props";

const ENTRY_LIMIT = 8;
const RECENT_LIMIT = 3;

export interface WatchCategory {
    color: string;
    emoji: string;
    id: string;
    income: boolean;
    name: string;
}

export interface WatchEntry {
    amount: string;
    at: number;
    category: string;
    color: string;
    date: string;
    emoji: string;
    id: string;
    income: boolean;
    note: string;
    rootCategoryId: string;
}

export interface WatchMoney {
    decimal: string;
    locale: Locale;
    minorUnits: number;
    symbol: string;
}

export interface WatchSnapshot {
    budget: Pick<
        BudgetViewProps,
        | "elapsedFraction"
        | "isOverall"
        | "name"
        | "over"
        | "percent"
        | "periodLabel"
        | "present"
        | "remaining"
        | "remainingCaption"
        | "spentFraction"
    >;
    categories: WatchCategory[];
    dateLabel: string;
    entries: WatchEntry[];
    labels: { all: string; income: string; recent: string; spent: string; yesterday: string };
    money: WatchMoney;
    todayLabel: string;
    todaySpent: string;
}

export interface AmountEntry {
    fraction: string | null;
    whole: string;
}

export interface AmountDisplay {
    ghost: string;
    typed: string;
}

export const DEMO_ENTRY: AmountEntry = { fraction: "4", whole: "18" };

const categoryId = (category: DemoRow["category"], income: boolean) => `${income ? "income" : "expense"}:${category}`;

const scaleOf = (money: WatchMoney) => 10 ** money.minorUnits;

export const formatUnits = (money: WatchMoney, units: number) =>
    `${money.symbol}${formatFixed(units / scaleOf(money), money.minorUnits, money.locale)}`;

export function entryUnits(entry: AmountEntry, money: WatchMoney): number {
    const cents = (entry.fraction ?? "").padEnd(money.minorUnits, "0").slice(0, money.minorUnits);
    return (Number(entry.whole) || 0) * scaleOf(money) + (Number(cents) || 0);
}

const zeros = (count: number) => "0".repeat(Math.max(count, 0));

export function entryDisplay(entry: AmountEntry, money: WatchMoney): AmountDisplay {
    const cents = money.minorUnits > 0 ? `${money.decimal}${zeros(money.minorUnits)}` : "";
    if (entry.whole === "") {
        return { ghost: `0${cents}`, typed: money.symbol };
    }
    const typed = `${money.symbol}${formatFixed(Number(entry.whole), 0, money.locale)}`;
    if (entry.fraction === null) {
        return { ghost: cents, typed };
    }
    return {
        ghost: zeros(money.minorUnits - entry.fraction.length),
        typed: `${typed}${money.decimal}${entry.fraction}`,
    };
}

export function recentCategories(snapshot: WatchSnapshot): WatchCategory[] {
    const expenses = new Map(
        snapshot.categories.filter((category) => !category.income).map((category) => [category.id, category])
    );
    const ids = new Set(snapshot.entries.map((entry) => entry.rootCategoryId));
    return [...ids].flatMap((id) => expenses.get(id) ?? []).slice(0, RECENT_LIMIT);
}

export function watchSnapshot(now: Date, locale: Locale): WatchSnapshot {
    const t = appTranslator(locale);
    const code = currencyFor(locale);
    const parts = amountParts(0, code, locale);
    const used = new Map(settled(now).map((row) => [row.category, row.income]));
    const categories = (["expense", "income"] as const).flatMap((kind) =>
        CANONICAL_CATEGORY_NAMES[kind]
            .filter((name) => used.get(name) === (kind === "income"))
            .map((name) => ({
                color: categoryStyle(name).color,
                emoji: "",
                id: categoryId(name, kind === "income"),
                income: kind === "income",
                name: categoryName(name, t),
            }))
    );
    const entries = settled(now)
        .toReversed()
        .toSorted((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, ENTRY_LIMIT)
        .map((row) => ({
            amount: formatAmount(row.amount, code, locale),
            at: row.date.getTime(),
            category: categoryName(row.category, t),
            color: imageColor(row.logo) ?? categoryStyle(row.category).color,
            date: formatDateHeader(row.date, now, locale, t),
            emoji: "",
            id: row.id,
            income: row.income,
            note: row.note,
            rootCategoryId: categoryId(row.category, row.income),
        }));
    const log = logWidgetProps(now, locale);
    return {
        budget: overallBudgetView(now, locale),
        categories,
        dateLabel: formatUpcomingDate(now, locale, t),
        entries,
        labels: {
            all: t("watch.all"),
            income: t("common.income"),
            recent: t("watch.recent"),
            spent: t("watch.spent"),
            yesterday: t("common.yesterday").toUpperCase(),
        },
        money: { decimal: parts.decimal, locale, minorUnits: parts.minorUnits, symbol: parts.symbol },
        todayLabel: log.todayLabel,
        todaySpent: log.todaySpent,
    };
}

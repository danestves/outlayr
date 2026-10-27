import { DEEP_LINKS } from "../lib/deep-links";
import { WIDGET_PALETTE } from "./palette";
import type { BudgetViewProps, InsightsViewProps, WidgetProps } from "./props";

const ZERO = "$0.00";

export const NO_BUDGET: BudgetViewProps = {
    elapsedFraction: 0,
    endsAt: 0,
    isOverall: true,
    limit: "",
    name: "No budget yet",
    over: false,
    percent: "",
    periodLabel: "BUDGET",
    present: false,
    rangeLabel: "",
    remaining: "",
    remainingCaption: "",
    spent: "",
    spentFraction: 0,
    url: DEEP_LINKS.budgets,
};

const quietHeader = (label: string) => ({
    income: { amount: ZERO, label, positive: true },
    net: { amount: ZERO, label, positive: true },
    spent: { amount: ZERO, label, positive: false },
});

const quietWindow = (periodLabel: string, labels: readonly string[]): InsightsViewProps => ({
    bars: labels.map((x) => ({ x, y: 0 })),
    income: ZERO,
    net: ZERO,
    netPositive: true,
    periodLabel,
    rangeLabel: "",
    slices: [],
    spent: ZERO,
    url: DEEP_LINKS.insights,
});

const numbered = (count: number) => Array.from({ length: count }, (_, index) => String(index + 1));

export const PLACEHOLDERS = {
    Budget: { chrome: WIDGET_PALETTE, views: { auto: NO_BUDGET, overall: NO_BUDGET, worst: NO_BUDGET } },
    Insights: {
        chrome: WIDGET_PALETTE,
        defaultPeriod: "week",
        windows: {
            month: quietWindow("THIS MONTH", numbered(30)),
            week: quietWindow("THIS WEEK", ["S", "M", "T", "W", "T", "F", "S"]),
            year: quietWindow("THIS YEAR", numbered(12)),
        },
    },
    Ledger: {
        chrome: WIDGET_PALETTE,
        entries: [],
        headers: {
            month: quietHeader("MONTH"),
            today: quietHeader("TODAY"),
            week: quietHeader("WEEK"),
            year: quietHeader("YEAR"),
        },
        url: DEEP_LINKS.log,
    },
    Log: { chrome: WIDGET_PALETTE, todayCount: 0, todayLabel: "TODAY", todaySpent: ZERO, url: DEEP_LINKS.newExpense },
} satisfies Omit<
    WidgetProps,
    "categories" | "currency" | "intentBudgets" | "showCents" | "watchEntries" | "week" | "zeroSpent"
>;

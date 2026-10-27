import { DEEP_LINKS } from "../../lib/deep-links";
import { envelope } from "./envelope";
import type { AndroidWidgetProps } from "./envelope";

const ZERO = "$0.00";

const actions = [
    { icon: "widget_amount", label: "Amount", url: DEEP_LINKS.newExpense },
    { icon: "widget_voice", label: "Voice", url: DEEP_LINKS.voice },
    { icon: "widget_scan", label: "Scan", url: DEEP_LINKS.scan },
];

const balance = {
    balance: ZERO,
    balanceLabel: "Balance",
    hideLabel: "Hide amounts",
    mask: "••••",
    showLabel: "Show amounts",
};

const header = (caption: string) => ({ amount: ZERO, caption, tone: "ink" as const });
const headers = (period: string) => ({
    income: header(`${period} · income`),
    net: header(`${period} · net`),
    spent: header(`${period} · spent`),
});

const done = "Done";
const periodOptions = [
    { label: "This week", value: "week" },
    { label: "This month", value: "month" },
    { label: "This year", value: "year" },
];

const trendWindow = (caption: string) => ({
    bars: [],
    caption,
    dayInitials: [],
    income: ZERO,
    net: ZERO,
    netPositive: true,
    slices: [],
    spent: ZERO,
});

export const ANDROID_PLACEHOLDERS = {
    Entries: envelope(() => ({
        add: { icon: "widget_add", label: "Amount", url: DEEP_LINKS.newExpense },
        empty: "Nothing logged yet",
        entries: [],
        headers: {
            month: headers("This month"),
            today: headers("Today"),
            week: headers("This week"),
            year: headers("This year"),
        },
        settings: {
            close: "Close",
            done,
            groups: [
                {
                    default: "spent",
                    key: "measure",
                    label: "Show",
                    options: [
                        { label: "Spent", value: "spent" },
                        { label: "Income", value: "income" },
                        { label: "Net", value: "net" },
                    ],
                },
                {
                    default: "month",
                    key: "period",
                    label: "Period",
                    options: [
                        { label: "Today", value: "today" },
                        { label: "Week", value: "week" },
                        { label: "Month", value: "month" },
                        { label: "Year", value: "year" },
                    ],
                },
            ],
        },
        url: DEEP_LINKS.log,
    })),
    Overview: envelope(() => ({
        ...balance,
        actions,
        budget: {
            fraction: 0,
            label: "No budget yet",
            left: "",
            over: false,
            pace: 0,
            present: false,
            timeLeft: "",
        },
        today: { label: "Today", spent: ZERO },
    })),
    Today: envelope(() => ({ actions, count: "0 entries", label: "Spent today", spent: ZERO })),
    Trends: envelope(() => ({
        defaultPeriod: "week" as const,
        labels: { income: "Income", net: "net", spent: "Spent" },
        settings: {
            close: "Close",
            done,
            groups: [
                {
                    default: "app",
                    key: "period",
                    label: "Period",
                    options: [{ label: "Match the app", value: "app" }, ...periodOptions],
                },
            ],
        },
        url: DEEP_LINKS.insights,
        windows: {
            month: trendWindow("This month"),
            week: trendWindow("This week"),
            year: trendWindow("This year"),
        },
    })),
    Wallet: envelope(() => ({ ...balance, actions })),
} satisfies AndroidWidgetProps;

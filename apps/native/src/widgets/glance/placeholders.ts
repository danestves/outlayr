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

export const ANDROID_PLACEHOLDERS = {
    Overview: envelope(() => ({
        ...balance,
        actions,
        budget: { fraction: 0, label: "No budget yet", left: "", over: false, present: false },
        today: { label: "Today", spent: ZERO },
    })),
    Today: envelope(() => ({ actions, count: "0 entries", label: "Spent today", spent: ZERO })),
    Wallet: envelope(() => ({ ...balance, actions })),
} satisfies AndroidWidgetProps;

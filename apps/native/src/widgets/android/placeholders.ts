import { DEEP_LINKS } from "../../lib/deep-links";
import { WIDGET_PALETTE } from "../palette";
import type { AndroidWidgetProps } from "./props";

const ZERO = "$0.00";
const MASK = "••••";

const shared = {
    actions: [
        { icon: "widget_amount", label: "Amount", url: DEEP_LINKS.newExpense },
        { icon: "widget_voice", label: "Voice", url: DEEP_LINKS.voice },
        { icon: "widget_scan", label: "Scan", url: DEEP_LINKS.scan },
    ],
    chrome: WIDGET_PALETTE,
};

/** Shown only between install and the app's first publish, which replaces them in the device language. */
export const ANDROID_PLACEHOLDERS = {
    Overview: {
        ...shared,
        balance: ZERO,
        balanceLabel: "Balance",
        budget: { fraction: 0, label: "No budget yet", left: "", over: false, present: false },
        mask: MASK,
        today: { label: "Today", spent: ZERO },
    },
    Today: { ...shared, count: "0 entries", label: "Spent today", spent: ZERO },
    Wallet: { ...shared, balance: ZERO, balanceLabel: "Balance", mask: MASK },
} satisfies AndroidWidgetProps;

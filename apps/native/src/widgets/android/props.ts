import { toAccountKind } from "@outlayr/money/account-kind";
import * as Effect from "effect/Effect";

import { settledBalanceAt } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import { loadValuation } from "@/data/valuation-source";
import type { Database } from "@/db/client";
import { AMOUNT_MASK, formatAmount } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";
import { DEEP_LINKS } from "@/lib/deep-links";

import { WIDGET_PALETTE } from "../palette";
import { buildWidgetProps } from "../props";

/** `icon` names a drawable that `plugins/with-android-widgets.ts` writes. */
export interface WidgetAction {
    icon: string;
    label: string;
    url: string;
}

interface Shared {
    actions: WidgetAction[];
    chrome: typeof WIDGET_PALETTE;
}

interface BalanceProps {
    balance: string;
    balanceLabel: string;
    /** Never sent by the app: the eye sets it, and the patched `expo-widgets` keeps it across snapshots. */
    hidden?: boolean;
    mask: string;
}

export type WalletWidgetProps = Shared & BalanceProps;

export type TodayWidgetProps = Shared & {
    count: string;
    label: string;
    spent: string;
};

export type OverviewWidgetProps = Shared &
    BalanceProps & {
        budget: { fraction: number; label: string; left: string; over: boolean; present: boolean };
        today: { label: string; spent: string };
    };

export interface AndroidWidgetProps {
    Overview: OverviewWidgetProps;
    Today: TodayWidgetProps;
    Wallet: WalletWidgetProps;
}

/** Cards and people stay out: a balance that nets debt reads as less cash than the user holds. */
const ownBalance = Effect.fn("Widgets.ownBalance")(function* ownBalance(db: Database, now: Date) {
    const valuation = yield* loadValuation(db);
    const accounts = yield* accountsRepo.listActive(db);
    const balances = yield* Effect.forEach(
        accounts.filter((account) => toAccountKind(account.kind) === "asset"),
        (account) => settledBalanceAt(db, account, valuation, now),
        { concurrency: "unbounded" }
    );
    return {
        currency: valuation.displayCurrency,
        total: balances.reduce((sum, balance) => sum + balance.value, 0),
    };
});

export const buildAndroidWidgetProps = Effect.fn("Widgets.buildAndroidProps")(function* buildAndroidWidgetProps(
    db: Database,
    now: Date
) {
    const props = yield* buildWidgetProps(db, now);
    const own = yield* ownBalance(db, now);
    const budget = props.Budget.views.auto;

    const shared: Shared = {
        actions: [
            { icon: "widget_amount", label: translateNow("log.widget.amount"), url: DEEP_LINKS.newExpense },
            { icon: "widget_voice", label: translateNow("log.widget.voice"), url: DEEP_LINKS.voice },
            { icon: "widget_scan", label: translateNow("log.widget.scan"), url: DEEP_LINKS.scan },
        ],
        chrome: WIDGET_PALETTE,
    };
    const balance: BalanceProps = {
        balance: formatAmount(own.total, own.currency, props.showCents),
        balanceLabel: translateNow("log.widget.balance"),
        mask: AMOUNT_MASK,
    };

    return {
        Overview: {
            ...shared,
            ...balance,
            budget: {
                fraction: budget.spentFraction,
                label: budget.present ? translateNow("log.widget.budgetLeft") : translateNow("budgets.widget.none"),
                left: budget.remaining,
                over: budget.over,
                present: budget.present,
            },
            today: { label: translateNow("common.today"), spent: props.Log.todaySpent },
        },
        Today: {
            ...shared,
            count:
                props.Log.todayCount === 1
                    ? translateNow("log.widget.entries.one")
                    : translateNow("log.widget.entries.other", { count: props.Log.todayCount }),
            label: translateNow("log.widget.spentToday"),
            spent: props.Log.todaySpent,
        },
        Wallet: { ...shared, ...balance },
    } satisfies AndroidWidgetProps;
});

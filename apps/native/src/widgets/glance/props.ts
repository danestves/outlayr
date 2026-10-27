import { toAccountKind } from "@outlayr/money/account-kind";
import * as Effect from "effect/Effect";

import { settledBalanceAt } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import type { Valuation } from "@/data/valuation-source";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { AMOUNT_MASK, formatAmount } from "@/domain/money";
import type { TranslatableKey } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";
import { translateIn } from "@/i18n/runtime";
import type { TranslationParams } from "@/i18n/translate";
import { DEEP_LINKS } from "@/lib/deep-links";

import { loadWidgetFigures } from "../props";
import { envelope } from "./envelope";
import type { AndroidWidgetProps } from "./envelope";

export interface AndroidWidgetFigures {
    balance: { currency: string; total: number };
    budget: { limit: number; spent: number } | null;
    currency: string;
    showCents: boolean;
    todayCount: number;
    todaySpent: number;
}

const ownBalance = Effect.fn("Widgets.ownBalance")(function* ownBalance(db: Database, valuation: Valuation, now: Date) {
    const accounts = yield* accountsRepo.listActive(db);
    const balances = yield* Effect.all(
        accounts
            .filter((account) => toAccountKind(account.kind) === "asset")
            .map((account) => settledBalanceAt(db, account, valuation, now)),
        { concurrency: "unbounded" }
    );
    return {
        currency: valuation.displayCurrency,
        total: balances.reduce((sum, balance) => sum + balance.value, 0),
    };
});

export function androidWidgetProps(figures: AndroidWidgetFigures): AndroidWidgetProps {
    const { budget } = figures;
    const copy = (language: Language) => {
        const t = (key: TranslatableKey, params?: TranslationParams) => translateIn(language, key, params);
        const money = (value: number) => formatAmount(value, figures.currency, figures.showCents, language);
        const over = budget !== null && budget.spent > budget.limit;
        return {
            actions: [
                { icon: "widget_amount", label: t("log.widget.amount"), url: DEEP_LINKS.newExpense },
                { icon: "widget_voice", label: t("log.widget.voice"), url: DEEP_LINKS.voice },
                { icon: "widget_scan", label: t("log.widget.scan"), url: DEEP_LINKS.scan },
            ],
            balance: {
                balance: formatSignedAmount(
                    figures.balance.total,
                    figures.balance.currency,
                    figures.showCents,
                    language
                ),
                balanceLabel: t("log.widget.balance"),
                hideLabel: t("log.amounts.hide"),
                mask: AMOUNT_MASK,
                showLabel: t("log.amounts.show"),
            },
            budget: budget
                ? {
                      fraction: budget.limit > 0 ? Math.min(1, Math.max(0, budget.spent / budget.limit)) : 0,
                      label: over ? t("log.widget.overBudget") : t("log.widget.budgetLeft"),
                      left: money(Math.abs(budget.limit - budget.spent)),
                      over,
                      present: true,
                  }
                : { fraction: 0, label: t("budgets.widget.none"), left: "", over: false, present: false },
            count: t("log.widget.entries", { count: figures.todayCount }),
            spent: money(figures.todaySpent),
            spentLabel: t("log.widget.spentToday"),
            todayLabel: t("common.today"),
        };
    };

    return {
        Overview: envelope((language) => {
            const { actions, balance, budget: budgetCopy, spent, todayLabel } = copy(language);
            return { ...balance, actions, budget: budgetCopy, today: { label: todayLabel, spent } };
        }),
        Today: envelope((language) => {
            const { actions, count, spent, spentLabel } = copy(language);
            return { actions, count, label: spentLabel, spent };
        }),
        Wallet: envelope((language) => {
            const { actions, balance } = copy(language);
            return { ...balance, actions };
        }),
    };
}

export const buildAndroidWidgetProps = Effect.fn("Widgets.buildAndroidProps")(function* buildAndroidWidgetProps(
    db: Database,
    now: Date
) {
    const { valuation, ...figures } = yield* loadWidgetFigures(db, now);
    const balance = yield* ownBalance(db, valuation, now);
    return androidWidgetProps({ ...figures, balance });
});

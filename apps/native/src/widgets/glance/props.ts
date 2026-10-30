import { toAccountKind } from "@outlayr/money/account-kind";
import { addDays, startOfDay } from "@outlayr/money/calendar";
import * as Effect from "effect/Effect";

import { settledBalanceAt } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import type { InsightsPeriod } from "@/data/insights";
import type { Valuation } from "@/data/valuation-source";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { budgetTimeLeftLabel } from "@/domain/budget-math";
import { formatTime, formatUpcomingDate } from "@/domain/dates";
import { AMOUNT_MASK, formatAmount } from "@/domain/money";
import type { TranslatableKey } from "@/i18n/catalog";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import type { Language } from "@/i18n/languages";
import { translateIn } from "@/i18n/runtime";
import type { TranslationParams } from "@/i18n/translate";
import { DEEP_LINKS } from "@/lib/deep-links";

import { buildInsights, buildLedgerHeaders, loadWidgetFigures, PERIOD_EYEBROW } from "../props";
import { envelope } from "./envelope";
import type { AndroidWidgetProps, EntriesCopy, EntriesMeasure, EntriesPeriod, TrendsCopy } from "./envelope";

export type AndroidWidgetFigures = Omit<Effect.Success<ReturnType<typeof loadWidgetFigures>>, "valuation"> & {
    balance: { currency: string; total: number };
    now: Date;
};

const PERIODS: readonly InsightsPeriod[] = ["week", "month", "year"];
const ENTRY_PERIODS: readonly EntriesPeriod[] = ["today", ...PERIODS];
const MEASURES: readonly EntriesMeasure[] = ["spent", "income", "net"];
const SLICES_SHOWN = 3;

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

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

export function androidWidgetProps(figures: AndroidWidgetFigures): AndroidWidgetProps {
    const { budget, now } = figures;
    const today = startOfDay(now).getTime();
    const yesterday = startOfDay(addDays(now, -1)).getTime();
    const copy = (language: Language) => {
        const t = (key: TranslatableKey, params?: TranslationParams) => translateIn(language, key, params);
        const money = (value: number) => formatAmount(value, figures.currency, figures.showCents, language);
        const whole = (value: number) => formatAmount(value, figures.currency, false, language);
        const over = budget?.overBudget ?? false;
        const span = budget ? budget.window.end.getTime() - budget.window.start.getTime() : 0;
        const periodCaption = (period: EntriesPeriod) =>
            period === "today" ? t("common.today") : capitalize(t(PERIOD_EYEBROW[period]));
        const when = (date: Date) => {
            const day = startOfDay(date).getTime();
            if (day === today) {
                return formatTime(date, figures.use24HourClock, language);
            }
            return day === yesterday ? t("common.yesterday") : formatUpcomingDate(date, language);
        };

        const ledgerHeaders = buildLedgerHeaders(figures.contributions, now, figures.calendar, whole);
        const header = (period: EntriesPeriod): EntriesCopy["headers"][EntriesPeriod] => {
            const caption = (measure: EntriesMeasure) =>
                `${periodCaption(period)} · ${t(`insights.measure.${measure}`).toLocaleLowerCase()}`;
            const { income, net, spent } = ledgerHeaders[period];
            return {
                income: { amount: income.amount, caption: caption("income"), tone: "income" },
                net: {
                    amount: `${net.positive ? "+" : "-"}${net.amount}`,
                    caption: caption("net"),
                    tone: net.positive ? "income" : "ink",
                },
                spent: { amount: spent.amount, caption: caption("spent"), tone: "ink" },
            };
        };
        const trendWindow = (period: InsightsPeriod): TrendsCopy["windows"][InsightsPeriod] => {
            const view = buildInsights(
                figures.contributions,
                figures.categoriesById,
                period,
                now,
                figures.calendar,
                whole,
                language
            );
            return {
                bars: view.bars.map((bar) => bar.y),
                caption: periodCaption(period),
                dayInitials: period === "week" ? view.bars.map((bar) => bar.x) : [],
                income: view.income,
                net: `${view.netPositive ? "+" : "-"}${view.net}`,
                netPositive: view.netPositive,
                slices: view.slices.slice(0, SLICES_SHOWN).map((slice) => ({
                    color: slice.color,
                    name: slice.name,
                    percent: `${Math.round(slice.fraction * 100)}%`,
                })),
                spent: view.spent,
            };
        };

        const entries: EntriesCopy = {
            add: { icon: "widget_add", label: t("log.widget.amount"), url: DEEP_LINKS.newExpense },
            empty: t("log.empty.title"),
            entries: figures.entries.map((entry) => ({
                amount: `${entry.income ? "+" : "-"}${formatAmount(
                    entry.amount,
                    entry.currency ?? figures.currency,
                    figures.showCents,
                    language
                )}`,
                color: entry.color,
                emoji: entry.emoji,
                id: entry.id,
                income: entry.income,
                note: entry.note || entry.category,
                when: when(entry.date),
            })),
            headers: {
                month: header("month"),
                today: header("today"),
                week: header("week"),
                year: header("year"),
            },
            settings: {
                close: t("common.close"),
                done: t("common.done"),
                groups: [
                    {
                        default: "spent",
                        key: "measure",
                        label: t("log.widget.show"),
                        options: MEASURES.map((value) => ({ label: t(`insights.measure.${value}`), value })),
                    },
                    {
                        default: "month",
                        key: "period",
                        label: t("log.widget.period"),
                        options: ENTRY_PERIODS.map((value) => ({
                            label: value === "today" ? t("common.today") : t(`insights.period.${value}`),
                            value,
                        })),
                    },
                ],
            },
            url: DEEP_LINKS.log,
        };

        const trends: TrendsCopy = {
            defaultPeriod: figures.period,
            labels: {
                income: t("common.income"),
                net: t("insights.measure.net").toLocaleLowerCase(),
                spent: t("insights.measure.spent"),
            },
            settings: {
                close: t("common.close"),
                done: t("common.done"),
                groups: [
                    {
                        default: "app",
                        key: "period",
                        label: t("log.widget.period"),
                        options: [
                            { label: t("log.widget.matchApp"), value: "app" },
                            ...PERIODS.map((value) => ({ label: periodCaption(value), value })),
                        ],
                    },
                ],
            },
            url: DEEP_LINKS.insights,
            windows: { month: trendWindow("month"), week: trendWindow("week"), year: trendWindow("year") },
        };

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
                      fraction: budget.amount > 0 ? Math.min(1, Math.max(0, budget.spent / budget.amount)) : 0,
                      label: over ? t("log.widget.overBudget") : t("log.widget.budgetLeft"),
                      left: money(Math.abs(budget.leftover)),
                      over,
                      pace:
                          span > 0
                              ? Math.min(1, Math.max(0, (now.getTime() - budget.window.start.getTime()) / span))
                              : 0,
                      present: true,
                      timeLeft: budgetTimeLeftLabel(budget.window, budget.type, now, t),
                  }
                : {
                      fraction: 0,
                      label: t("budgets.widget.none"),
                      left: "",
                      over: false,
                      pace: 0,
                      present: false,
                      timeLeft: "",
                  },
            count: t("log.widget.entries", { count: figures.todayCount }),
            entries,
            spent: money(figures.todaySpent),
            spentLabel: t("log.widget.spentToday"),
            todayLabel: t("common.today"),
            trends,
        };
    };

    const copies = new Map(SUPPORTED_LANGUAGES.map((language) => [language, copy(language)]));
    const copyIn = (language: Language) => copies.get(language) ?? copy(language);

    return {
        Entries: envelope((language) => copyIn(language).entries),
        Overview: envelope((language) => {
            const { actions, balance, budget: budgetCopy, spent, todayLabel } = copyIn(language);
            return { ...balance, actions, budget: budgetCopy, today: { label: todayLabel, spent } };
        }),
        Today: envelope((language) => {
            const { actions, count, spent, spentLabel } = copyIn(language);
            return { actions, count, label: spentLabel, spent };
        }),
        Trends: envelope((language) => copyIn(language).trends),
        Wallet: envelope((language) => {
            const { actions, balance } = copyIn(language);
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
    return androidWidgetProps({ ...figures, balance, now });
});

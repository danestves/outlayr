import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNetWorth } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import type { InsightsCalendar, InsightsPeriod } from "@/data/insights";
import { useInsights } from "@/data/use-insights";
import { useInsightsAnswers } from "@/data/use-insights-answers";
import { useNow } from "@/data/use-now";
import { BALANCES_ACCOUNTS } from "@/domain/balances";
import { monthLongTitle } from "@/domain/dates";
import type { Answers, HeadlineKind } from "@/domain/insights-answers";
import { recapRowVisible } from "@/domain/recap-month";
import { monthKey } from "@/domain/year-plan";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { SILENT } from "@/state/atom-command";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { paceTicks } from "./answers-ticks";
import { AnswerCards } from "./components/answer-cards";
import { AnswersPaceChart } from "./components/answers-pace-chart";
import { EverythingElse } from "./components/everything-else";
import type { EverythingRow } from "./components/everything-else";
import { InsightsPeriodMenu } from "./components/insights-period-menu";
import { InsightsSample } from "./components/insights-sample";
import { InsightsWindow } from "./components/insights-window";
import { RecapRow } from "./components/recap-row";
import { useMoney } from "./components/use-money";
import type { Money } from "./components/use-money";
import { periodOf } from "./periods";

const ignoreMeasure = () => undefined;

const HEADLINE_KEYS = {
    asUsual: "insights.answers.asUsual",
    faster: "insights.answers.faster",
    less: "insights.answers.less",
    onTrack: "insights.answers.onTrack",
} as const satisfies Partial<Record<HeadlineKind, TranslationKey>>;

interface PeriodNames {
    bar: string;
    name: string;
}

function periodNames(
    period: InsightsPeriod,
    start: Date,
    label: string,
    firstDayOfMonth: number,
    closed: boolean,
    language: Language,
    t: TranslateFn
): PeriodNames {
    if (period === "month" && firstDayOfMonth === 1) {
        const month = monthLongTitle(start, language);
        return { bar: month, name: month };
    }
    if (closed) {
        return { bar: label, name: label };
    }
    switch (period) {
        case "week": {
            const week = t("insights.answers.thisWeek");
            return { bar: week, name: week };
        }
        case "month": {
            return { bar: t("insights.answers.thisMonth"), name: label };
        }
        default: {
            return { bar: t("insights.answers.thisYear"), name: label };
        }
    }
}

function headlineText(answers: Answers, period: InsightsPeriod, name: string, money: Money, t: TranslateFn): string {
    const { headline, spent } = answers;
    if (headline === "past") {
        const amount = money.exact(spent);
        return period === "week"
            ? t("insights.answers.pastWeek", { amount })
            : t("insights.answers.pastIn", { amount, period: name });
    }
    if (headline === "soFar") {
        return t("insights.answers.total", { amount: money.exact(spent) });
    }
    return t(HEADLINE_KEYS[headline]);
}

interface SubSentence {
    emphasis?: string;
    text: string;
}

function subSentence(answers: Answers, limit: number | null, money: Money, t: TranslateFn): SubSentence | null {
    const { forecast, spent, usualByNow } = answers;
    if (forecast == null) {
        if (usualByNow == null || usualByNow <= 0 || Math.round(Math.abs(spent - usualByNow)) === 0) {
            return null;
        }
        return {
            text: t(spent > usualByNow ? "insights.answers.pastMore" : "insights.answers.pastLess", {
                gap: money.rounded(Math.abs(spent - usualByNow)),
                usual: money.rounded(usualByNow),
            }),
        };
    }
    const pace = money.rounded(forecast);
    if (limit != null) {
        const over = forecast > limit;
        const gap = t(over ? "insights.answers.over" : "insights.answers.under", {
            amount: money.rounded(Math.abs(forecast - limit)),
        });
        const text = t(over ? "insights.answers.paceOver" : "insights.answers.paceUnder", {
            gap,
            limit: money.exact(limit),
            pace,
        });
        return over ? { emphasis: gap, text } : { text };
    }
    if (usualByNow != null && usualByNow > 0) {
        return { text: t("insights.answers.paceUsual", { pace, usual: money.rounded(usualByNow) }) };
    }
    return { text: t("insights.answers.paceOnly", { pace }) };
}

function Sentence({ emphasis, text }: SubSentence) {
    const at = emphasis ? text.indexOf(emphasis) : -1;
    return (
        <Text className="text-subtitle text-muted pt-2">
            {emphasis && at !== -1 ? (
                <>
                    {text.slice(0, at)}
                    <Text className="font-sans-semibold text-danger">{emphasis}</Text>
                    {text.slice(at + emphasis.length)}
                </>
            ) : (
                text
            )}
        </Text>
    );
}

function KeepRow({ danger, label, value }: { danger?: boolean; label: string; value?: string }) {
    return (
        <View className="border-border mt-4 flex-row items-baseline justify-between gap-3 border-y py-3">
            <Text
                className={
                    danger
                        ? "font-sans-medium text-subtitle text-danger shrink"
                        : "font-sans-medium text-subtitle text-foreground shrink"
                }
            >
                {label}
            </Text>
            {value ? <Text className="font-sans-bold text-headline text-foreground tabular-nums">{value}</Text> : null}
        </View>
    );
}

export function Insights() {
    const db = useDatabase();
    const savePeriod = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the insights period failed", Cause.squash(cause)) },
        SILENT
    );
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const currency = useGlobalCurrency(db);
    const money = useMoney(currency);
    const nowMs = useNow();
    const { series: netWorth } = useNetWorth(db, nowMs);

    const incomeTracking = useSettingBool("incomeTracking");
    const period = periodOf(useSettingNumber("insightsTimeFrame"));
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const calendar: InsightsCalendar = { firstDayOfMonth, firstWeekday };

    const [offset, setOffset] = useState(0);
    const result = useInsights(db, nowMs, period, "spent", offset, calendar);
    const answered = useInsightsAnswers(db, nowMs, period, offset, calendar);

    if (!result.hasHistory) {
        return <InsightsSample onAddTransaction={() => router.push("/transactions/create")} />;
    }

    const selectPeriod = (value: number) => {
        setOffset(0);
        savePeriod({ db, key: "insightsTimeFrame", value });
    };

    const { answers, progress, limit, stayUnder } = answered;
    const names = periodNames(period, result.start, result.label, firstDayOfMonth, progress.closed, language, t);
    const spent = money.exact(answers.spent);
    const eyebrow = progress.closed
        ? `${names.name} · ${spent}`
        : `${t("insights.answers.eyebrow", { period: names.name })} · ${spent}`;
    const sub = subSentence(answers, limit, money, t);

    const openBreakdown = () => router.push({ params: { offset: String(offset) }, pathname: "/insights/breakdown" });
    const worth = netWorth.at(-1);
    const nextYear = new Date(nowMs).getFullYear() + 1;
    const rows: EverythingRow[] = [
        {
            id: "categories",
            label: t("insights.answers.allCategories"),
            onPress: openBreakdown,
            value: String(result.breakdown.length),
        },
        ...(incomeTracking
            ? [
                  {
                      id: "income",
                      label: t("insights.answers.incomeNet"),
                      onPress: () => router.push(`/insights/cash-flow?offset=${offset}`),
                      value: money.net(result.net),
                  },
              ]
            : []),
        {
            id: "byDay",
            label: t(period === "year" ? "insights.chart.byMonth" : "insights.chart.byDay"),
            onPress: openBreakdown,
            value: t(period === "year" ? "insights.widget.perMonth" : "insights.widget.perDay", {
                amount: money.rounded(result.measureAverage),
            }),
        },
        ...(worth
            ? [
                  {
                      id: "netWorth",
                      label: t("insights.netWorth.heading"),
                      onPress: () => router.navigate(BALANCES_ACCOUNTS),
                      value: money.balance(worth.value),
                  },
              ]
            : []),
        {
            id: "plan",
            label: t("insights.answers.plan", { year: nextYear }),
            onPress: () => router.push(`/insights/plan/${monthKey(nextYear, 0)}`),
        },
    ];

    return (
        <>
            <InsightsPeriodMenu
                measure="spent"
                measures={[]}
                onMeasure={ignoreMeasure}
                onSelect={selectPeriod}
                period={period}
            />

            <ScrollView
                className="bg-background"
                contentContainerClassName="pb-6"
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="px-5">
                    {recapRowVisible(new Date(nowMs)) ? <RecapRow nowMs={nowMs} /> : null}
                    <View className="flex-row flex-wrap gap-2">
                        <InsightsWindow
                            atCurrent={result.atCurrent}
                            atEarliest={result.atEarliest}
                            label={result.label}
                            onOffset={setOffset}
                        />
                    </View>

                    <View className="pt-3.5">
                        <MonoLabel numberOfLines={1}>{eyebrow}</MonoLabel>
                        <Text
                            accessibilityRole="header"
                            className="font-sans-bold text-foreground pt-1 text-[26px] leading-8 tracking-tight"
                        >
                            {headlineText(answers, period, names.name, money, t)}
                        </Text>
                        {sub ? <Sentence {...sub} /> : null}
                    </View>

                    <View className="pt-4">
                        <AnswersPaceChart
                            cumulative={answers.cumulative}
                            days={progress.days}
                            forecast={answers.forecast}
                            forecastLabel={answers.forecast == null ? null : `≈ ${money.rounded(answers.forecast)}`}
                            limit={limit}
                            limitLabel={
                                limit == null
                                    ? null
                                    : t("insights.answers.chart.limit", { amount: money.rounded(limit) })
                            }
                            ticks={paceTicks(period, progress.window, progress.days, language)}
                            todayLabel={t("insights.answers.chart.today")}
                        />
                    </View>

                    {stayUnder?.kind === "perDay" ? (
                        <KeepRow
                            label={t("insights.answers.stayUnder")}
                            value={t("insights.widget.perDay", { amount: money.rounded(stayUnder.perDay) })}
                        />
                    ) : null}
                    {stayUnder?.kind === "over" ? (
                        <KeepRow
                            danger
                            label={t("insights.answers.overLimit", { amount: money.rounded(stayUnder.over) })}
                        />
                    ) : null}
                </View>

                <View className="gap-2.5 px-5 pt-5">
                    <AnswerCards
                        cards={answers.cards}
                        context={{
                            barName: names.bar,
                            budgetIds: answered.budgetIds,
                            calendar,
                            categories: result.categoriesById,
                            closed: progress.closed,
                            code: currency,
                            db,
                            nowMs,
                            offset,
                            period,
                            subscriptions: answered.subscriptions,
                            window: progress.window,
                        }}
                    />
                </View>

                <View className="px-5">
                    <EverythingElse rows={rows} />
                </View>
            </ScrollView>
        </>
    );
}

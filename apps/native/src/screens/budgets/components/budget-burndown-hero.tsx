import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, useTapGesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

import { HeroNumber } from "@/components/amount-text";
import { MeasureStrip } from "@/components/import-sheet/measure-strip";
import type { MeasureStripCell } from "@/components/import-sheet/measure-strip";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { MainBudgetView } from "@/data/budgets";
import type { Burndown } from "@/domain/budget-burndown";
import { budgetPeriodPhrase, budgetTimeLeftLabel, leftPerDay } from "@/domain/budget-math";
import { monthAbbrev } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import { BudgetBurndownChart } from "./budget-burndown-chart";
import { BudgetDaySlots } from "./budget-day-slots";

const BLEED = 8;

interface BudgetBurndownHeroProps {
    budget: MainBudgetView;
    burndown: Burndown | null;
    contributions: readonly ExpenseContribution[];
    currency: string;
    dominant?: { name: string; share: number } | null;
    nowMs: number;
    onPress: () => void;
}

const SERIF = "InstrumentSerif_400Regular";

const CHART_HEIGHT = 168;

function formatDayMonth(date: Date, language: Language): string {
    return `${date.getDate()} ${monthAbbrev(date, language)}`;
}

function dayDate(start: Date, day: number): Date {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + day - 1);
}

export function BudgetBurndownHero({
    budget,
    burndown,
    contributions,
    dominant,
    currency,
    onPress,
    nowMs,
}: BudgetBurndownHeroProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const { width: windowWidth } = useWindowDimensions();
    const [measured, setMeasured] = useState(0);
    const [scrubDay, setScrubDay] = useState<number | null>(null);

    const now = new Date(nowMs);
    const period = t(budgetPeriodPhrase(budget.type));
    const isDay = budget.type === BUDGET_TYPE.day;
    const showChart = burndown != null && !isDay;

    const scrubbed = scrubDay == null ? null : (burndown?.points[scrubDay - 1] ?? null);
    const balance = scrubbed ? scrubbed.balance : budget.leftover;
    const over = balance < 0;
    const scrubLabel = scrubbed ? formatDayMonth(dayDate(budget.window.start, scrubbed.day), language) : null;

    const projected = burndown?.projectedBalance ?? null;
    const endsShort = projected != null && projected < 0;
    const balanceLabel = formatAmount(Math.abs(balance), currency, showCents, language);
    const perDay = budget.leftover < 0 ? null : leftPerDay(budget.leftover, budget.window, now);
    const measures: MeasureStripCell[] = [
        {
            figure: formatAmount(budget.amount, currency, false, language),
            key: "limit",
            label: t("budgets.measure.limit"),
        },
        {
            figure: formatAmount(budget.spent, currency, false, language),
            key: "spent",
            label: t("budgets.measure.spent"),
        },
    ];
    if (perDay !== null) {
        measures.push({
            figure: formatAmount(perDay, currency, perDay < 10, language),
            key: "perDay",
            label: t("budgets.measure.perDay"),
        });
    }

    const status = over ? t("budgets.hero.overBudget") : t("budgets.hero.leftPeriod", { period });
    const footnote = scrubLabel ? t("budgets.hero.onDate", { date: scrubLabel, label: status }) : status;

    const chartWidth = measured > 0 ? measured + BLEED * 2 : windowWidth - 24;

    const openDetail = useTapGesture({
        onDeactivate: (event) => {
            "worklet";
            if (!event.canceled) {
                scheduleOnRN(onPress);
            }
        },
    });

    const onLayout = (event: LayoutChangeEvent) => {
        setMeasured(event.nativeEvent.layout.width);
    };

    return (
        <View>
            {/* A tap gesture, not a Pressable: RN's responder cannot arbitrate with the chart's RNGH pan,
                which would claim every touch and stop the card opening. */}
            <GestureDetector gesture={openDetail}>
                <View
                    accessibilityLabel={
                        over
                            ? t("budgets.hero.a11yOver", {
                                  amount: balanceLabel,
                                  name: budget.name,
                              })
                            : t("budgets.hero.a11yLeft", {
                                  amount: balanceLabel,
                                  name: budget.name,
                                  period,
                              })
                    }
                    accessibilityRole="button"
                >
                    <View onLayout={onLayout}>
                        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3">
                            <MonoLabel>{t("budgets.hero.eyebrow", { period: period.toUpperCase() })}</MonoLabel>
                            <MonoLabel>
                                {scrubLabel
                                    ? scrubLabel.toUpperCase()
                                    : budgetTimeLeftLabel(budget.window, budget.type, now, t).toUpperCase()}
                            </MonoLabel>
                        </View>

                        <View className="pt-2">
                            <HeroNumber
                                amount={Math.abs(balance)}
                                code={currency}
                                showCents={showCents}
                                sign=""
                                size={40}
                                toneClass={over ? "text-over-budget" : "text-foreground"}
                            />
                        </View>
                        <Text className="text-footnote text-muted pt-0.5">{footnote}</Text>
                    </View>

                    {showChart && burndown ? (
                        <View className="pt-4" style={{ marginHorizontal: -BLEED }}>
                            <BudgetBurndownChart
                                burndown={burndown}
                                height={CHART_HEIGHT}
                                limit={budget.amount}
                                onScrub={setScrubDay}
                                width={chartWidth}
                            />
                        </View>
                    ) : null}

                    {isDay ? (
                        <BudgetDaySlots
                            contributions={contributions}
                            currency={currency}
                            limit={budget.amount}
                            nowMs={nowMs}
                            window={budget.window}
                        />
                    ) : null}

                    {/* Ruled like the Log's own head. */}
                    <View className="pt-3.5">
                        <MeasureStrip cells={measures} className="border-b-0" />
                    </View>
                </View>
            </GestureDetector>

            {scrubbed || isDay ? null : (
                <HeroVerdict burndown={burndown} currency={currency} dominant={dominant} periodEndsShort={endsShort} />
            )}
        </View>
    );
}

function HeroVerdict({
    burndown,
    currency,
    dominant,
    periodEndsShort,
}: {
    burndown: Burndown | null;
    currency: string;
    dominant?: { name: string; share: number } | null;
    periodEndsShort: boolean;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    if (!burndown) {
        return null;
    }

    let sentence: string | null = null;
    if (burndown.runwayDate && burndown.runwayDay != null) {
        const ranOut = formatDayMonth(burndown.runwayDate, language);
        const early = burndown.totalDays - burndown.runwayDay;
        sentence =
            early > 0
                ? t("budgets.hero.verdictRanOutEarly", {
                      date: ranOut,
                      days: t("budgets.days", { count: early }),
                  })
                : t("budgets.hero.verdictRanOutFinal", { date: ranOut });
    } else if (periodEndsShort && burndown.projectedBalance != null) {
        sentence = t("budgets.hero.verdictEndsShort", {
            amount: formatAmount(Math.abs(burndown.projectedBalance), currency, false, language),
        });
    }

    if (!sentence) {
        return null;
    }

    // A share under a fifth is not a culprit.
    const blame =
        dominant && dominant.share >= 0.2
            ? t("budgets.hero.verdictBlame", { name: dominant.name, percent: Math.round(dominant.share * 100) })
            : null;

    return (
        <Text
            className="text-foreground text-title px-1 pt-4 leading-snug"
            // Not a `font-serif` class: uniwind's theme already ships a `--font-serif`, and its generic stack wins.
            style={{ fontFamily: SERIF }}
        >
            {sentence}
            {blame ? ` ${blame}` : null}
        </Text>
    );
}

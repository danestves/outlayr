import { use } from "react";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { LogInsights as LogInsightsData, LogPeriod } from "@/data/log-totals";
import { measureIsIncome, measureIsPositive, measureMagnitude } from "@/domain/log-measure";
import type { LogFigures, LogMeasure, NarrowedMeasure } from "@/domain/log-measure";
import type { SparklinePoint } from "@/domain/log-sparkline";
import { formatTrend, measureTrend } from "@/domain/log-trend";
import { formatAmount, maskedAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { HEAD_PERIOD_KEY, MEASURE_WORD_KEY, PERIOD_PHRASE_KEY, splitCells, TREND_BASE_KEY } from "../labels";
import { AmountsEyeButton } from "./amounts-eye-button";
import { logCurrencyActions, logPeriodActions, pressLogCurrencyAction, pressLogPeriodAction } from "./log-head-actions";
import { LogHeadMenu } from "./log-head-menu";
import { LogHeroNumber } from "./log-hero-number";
import { LogLimit } from "./log-limit";
import { LogSparkline } from "./log-sparkline";
import { LogSplit } from "./log-split";

/** Drops the line to the hero's baseline, past the measure label. */
const SPARKLINE_OFFSET = 23;

interface LogInsightsProps {
    currencyOptions: readonly string[];
    displayCurrency: string;
    insights: LogInsightsData;
    limit?: ComponentProps<typeof LogLimit> | null;
    narrowed: NarrowedMeasure | null;
    /** Null puts the screen back in the ledger's own currency. */
    onDisplayCurrency: (code: string | null) => void;
    onManageCurrencies: () => void;
    onNarrow: (next: NarrowedMeasure | null) => void;
    onPeriod: (period: LogPeriod) => void;
    period: LogPeriod;
    previous: LogInsightsData | null;
    sparkline?: SparklineData | null;
}

export interface SparklineData {
    byMonth: boolean;
    points: SparklinePoint[];
}

/** No currency arithmetic here: `useLogInsights` does it. */
export function LogInsights({
    insights,
    previous,
    narrowed,
    onNarrow,
    period,
    onPeriod,
    displayCurrency,
    currencyOptions,
    onDisplayCurrency,
    onManageCurrencies,
    limit = null,
    sparkline = null,
}: LogInsightsProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    // Falls back to the dominant bucket only when nothing could be placed in `displayCurrency`.
    const figures = insights.perCurrency.find((f) => f.currencyCode === displayCurrency) ?? insights.dominant;
    const before = previous?.perCurrency.find((f) => f.currencyCode === figures.currencyCode) ?? null;
    const alsoThisPeriod = insights.perCurrency.filter((f) => f.currencyCode !== figures.currencyCode);
    const measure: LogMeasure = narrowed ?? "net";
    const trend = before ? measureTrend(measure, figures, before) : null;

    return (
        <View className="pb-2">
            <View className="flex-row items-center justify-between gap-2 pt-1">
                <LogHeadMenu
                    actions={logPeriodActions(period, t)}
                    label={t(HEAD_PERIOD_KEY[period])}
                    onPressAction={(id) => pressLogPeriodAction(onPeriod, id)}
                />
                <View className="flex-row items-center">
                    <AmountsEyeButton />
                    <LogHeadMenu
                        // The figures' own currency, which may be a fallback from the request.
                        actions={logCurrencyActions(currencyOptions, figures.currencyCode, t)}
                        label={figures.currencyCode}
                        onPressAction={(id) =>
                            pressLogCurrencyAction(
                                {
                                    // The ledger's own currency leads, so choosing it clears the override.
                                    onCurrency: (code) => onDisplayCurrency(code === currencyOptions[0] ? null : code),
                                    onManageCurrencies,
                                },
                                id
                            )
                        }
                    />
                </View>
            </View>

            <View className="flex-row gap-3 pt-0.5 pb-3">
                <View className="flex-1">
                    <Text className="text-muted font-sans-medium text-footnote">{t(MEASURE_WORD_KEY[measure])}</Text>
                    <LogHeroNumber
                        code={figures.currencyCode}
                        magnitude={measureMagnitude(measure, figures)}
                        positive={measureIsPositive(measure, figures)}
                        showCents={showCents}
                    />
                    {trend && period !== "all" ? (
                        <Text className="text-muted font-sans-medium text-footnote">
                            <Text className={cn("tabular-nums", trend.good ? "text-income" : "text-expense")}>
                                {formatTrend(trend.change, language)}
                            </Text>{" "}
                            {t(TREND_BASE_KEY[period])}
                        </Text>
                    ) : null}
                </View>
                {sparkline && sparkline.points.length > 1 ? (
                    <View style={{ marginTop: SPARKLINE_OFFSET }}>
                        <LogSparkline byMonth={sparkline.byMonth} measure={measure} points={sparkline.points} />
                    </View>
                ) : null}
            </View>

            {limit && period === "month" ? <LogLimit {...limit} figureCurrency={figures.currencyCode} /> : null}

            <LogSplit
                cells={splitCells(narrowed, figures, before, t, onNarrow)}
                code={figures.currencyCode}
                showCents={showCents}
            />

            {alsoThisPeriod.length > 0 ? (
                <View className="border-border gap-2 border-t pt-3">
                    <MonoLabel>{t("log.insights.also", { period: t(PERIOD_PHRASE_KEY[period]) })}</MonoLabel>
                    <View className="flex-row flex-wrap gap-1.5">
                        {alsoThisPeriod.map((entry) => (
                            <AlsoPill
                                figures={entry}
                                key={entry.currencyCode}
                                measure={measure}
                                showCents={showCents}
                            />
                        ))}
                    </View>
                </View>
            ) : null}
        </View>
    );
}

function AlsoPill({ figures, measure, showCents }: { figures: LogFigures; measure: LogMeasure; showCents: boolean }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);

    const sign = measureIsPositive(measure, figures) ? "+" : "-";
    const magnitude = hidden
        ? maskedAmount(figures.currencyCode)
        : formatAmount(measureMagnitude(measure, figures), figures.currencyCode, showCents, language);
    const amount = `${sign}${magnitude}`;

    return (
        <View
            accessibilityLabel={`${figures.currencyCode}, ${hidden ? t("log.amounts.hidden") : amount}`}
            accessible
            className="bg-surface-secondary flex-row items-center gap-1.5 rounded-[7px] px-2 py-1"
        >
            <MonoLabel>{figures.currencyCode}</MonoLabel>
            <Text
                className={cn(
                    "tabular-nums",
                    "font-sans-semibold text-footnote",
                    measureIsIncome(measure) ? "text-income" : "text-foreground"
                )}
                numberOfLines={1}
            >
                {amount}
            </Text>
        </View>
    );
}

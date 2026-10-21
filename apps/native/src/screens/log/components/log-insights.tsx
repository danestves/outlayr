import { GlassContainer } from "expo-glass-effect";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { LedgerHead } from "@/components/ledger-head";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { LogInsights as LogInsightsData, LogPeriod } from "@/data/log-totals";
import { measureIsIncome, measureIsPositive, measureMagnitude } from "@/domain/log-measure";
import type { LogFigures, LogMeasure } from "@/domain/log-measure";
import type { SparklinePoint } from "@/domain/log-sparkline";
import { formatAmount, maskedAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { measureCells, MEASURE_WORD_KEY, PERIOD_PHRASE_KEY } from "../labels";
import { AmountsEyeButton } from "./amounts-eye-button";
import { DisplayCurrencyChip } from "./display-currency-chip";
import { LogHeroNumber } from "./log-hero-number";
import { LogSparkline } from "./log-sparkline";

const LOG_CONTROLS = { alignItems: "center", flexDirection: "row", gap: 8 } as const;
const LOG_CONTROLS_UNDER_HERO = { ...LOG_CONTROLS, alignSelf: "flex-end" } as const;

interface LogInsightsProps {
    currencyOptions: readonly string[];
    displayCurrency: string;
    insights: LogInsightsData;
    measure: LogMeasure;
    /** Null puts the screen back in the ledger's own currency. */
    onDisplayCurrency: (code: string | null) => void;
    onManageCurrencies: () => void;
    onMeasure: (measure: LogMeasure) => void;
    period: LogPeriod;
    sparkline?: SparklineData | null;
}

export interface SparklineData {
    byMonth: boolean;
    points: SparklinePoint[];
    positive: boolean;
    range: number;
}

/** No currency arithmetic here: `useLogInsights` does it. */
export function LogInsights({
    insights,
    measure,
    onMeasure,
    period,
    displayCurrency,
    currencyOptions,
    onDisplayCurrency,
    onManageCurrencies,
    sparkline = null,
}: LogInsightsProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    // Falls back to the dominant bucket only when nothing could be placed in `displayCurrency`.
    const figures = insights.perCurrency.find((f) => f.currencyCode === displayCurrency) ?? insights.dominant;
    const alsoThisPeriod = insights.perCurrency.filter((f) => f.currencyCode !== figures.currencyCode);

    return (
        <View className="pt-3.5 pb-1.5">
            <MonoLabel>{`${t(MEASURE_WORD_KEY[measure])} · ${t(PERIOD_PHRASE_KEY[period])}`}</MonoLabel>

            <View className={largeText ? "gap-2 pt-1" : "flex-row items-center gap-2 pt-1"}>
                <View className={largeText ? undefined : "flex-1"}>
                    <LogHeroNumber
                        code={figures.currencyCode}
                        magnitude={measureMagnitude(measure, figures)}
                        positive={measureIsPositive(measure, figures)}
                        showCents={showCents}
                    />
                </View>
                <GlassContainer style={largeText ? LOG_CONTROLS_UNDER_HERO : LOG_CONTROLS}>
                    <AmountsEyeButton />
                    <DisplayCurrencyChip
                        // The figures' own currency, which may be a fallback from the request.
                        code={figures.currencyCode}
                        onManage={onManageCurrencies}
                        onSelect={(code) =>
                            // The ledger's own currency leads, so choosing it clears the override.
                            onDisplayCurrency(code === currencyOptions[0] ? null : code)
                        }
                        options={currencyOptions}
                    />
                </GlassContainer>
            </View>

            <View className="pt-3">
                <LedgerHead cells={measureCells(measure, figures, t, onMeasure)} code={figures.currencyCode} />
            </View>

            {alsoThisPeriod.length > 0 ? (
                <View className="gap-2 pt-3">
                    <View className="pb-0.75">
                        <View className="bg-border h-px w-full" />
                    </View>
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

            {sparkline && sparkline.points.length > 1 ? (
                <LogSparkline
                    byMonth={sparkline.byMonth}
                    code={figures.currencyCode}
                    measure={measure}
                    points={sparkline.points}
                    positive={sparkline.positive}
                    range={sparkline.range}
                />
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

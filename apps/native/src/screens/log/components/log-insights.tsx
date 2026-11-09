import { GlassContainer } from "expo-glass-effect";
import { use } from "react";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { LedgerHead } from "@/components/ledger-head";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { LogInsights as LogInsightsData, LogPeriod } from "@/data/log-totals";
import { measureIsIncome, measureIsPositive, measureMagnitude } from "@/domain/log-measure";
import type { LogFigures, LogMeasure, NarrowedMeasure } from "@/domain/log-measure";
import type { SparklinePoint } from "@/domain/log-sparkline";
import { formatAmount, maskedAmount } from "@/domain/money";
import type { BarPeriod, PeriodBar } from "@/domain/period-bars";
import { useLanguage, useTranslation } from "@/i18n/context";

import { headCells, PERIOD_PHRASE_KEY } from "../labels";
import { AmountsEyeButton } from "./amounts-eye-button";
import { LogLimit } from "./log-limit";
import { LogPeriodBars } from "./log-period-bars";
import { LogScopeMenu } from "./log-scope-menu";
import { LogSparkline } from "./log-sparkline";

const LOG_CONTROLS = { alignItems: "center", flexDirection: "row", gap: 8 } as const;

interface LogInsightsProps {
    bars?: { period: BarPeriod; rows: PeriodBar[] } | null;
    currencyOptions: readonly string[];
    displayCurrency: string;
    insights: LogInsightsData;
    limit?: ComponentProps<typeof LogLimit> | null;
    narrowed: NarrowedMeasure | null;
    nowMs: number;
    /** Null puts the screen back in the ledger's own currency. */
    onDisplayCurrency: (code: string | null) => void;
    onManageCurrencies: () => void;
    onNarrow: (next: NarrowedMeasure | null) => void;
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
    narrowed,
    onNarrow,
    period,
    displayCurrency,
    currencyOptions,
    onDisplayCurrency,
    onManageCurrencies,
    nowMs,
    bars = null,
    limit = null,
    sparkline = null,
}: LogInsightsProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    // Falls back to the dominant bucket only when nothing could be placed in `displayCurrency`.
    const figures = insights.perCurrency.find((f) => f.currencyCode === displayCurrency) ?? insights.dominant;
    const alsoThisPeriod = insights.perCurrency.filter((f) => f.currencyCode !== figures.currencyCode);
    const measure: LogMeasure = narrowed ?? "net";

    return (
        <View className="pt-3.5 pb-1.5">
            <View className="flex-row items-center justify-between gap-2 pb-3">
                <LogScopeMenu
                    currencies={currencyOptions}
                    // The figures' own currency, which may be a fallback from the request.
                    currency={figures.currencyCode}
                    label={`${t(PERIOD_PHRASE_KEY[period])} · ${figures.currencyCode}`}
                    // The ledger's own currency leads, so choosing it clears the override.
                    onCurrency={(code) => onDisplayCurrency(code === currencyOptions[0] ? null : code)}
                    onManageCurrencies={onManageCurrencies}
                />
                <GlassContainer style={LOG_CONTROLS}>
                    <AmountsEyeButton />
                </GlassContainer>
            </View>

            <LedgerHead cells={headCells(narrowed, figures, t, onNarrow)} code={figures.currencyCode} />

            {limit && period === "month" ? <LogLimit {...limit} figureCurrency={figures.currencyCode} /> : null}

            {bars ? (
                <LogPeriodBars
                    bars={bars.rows}
                    code={figures.currencyCode}
                    income={narrowed === "in"}
                    nowMs={nowMs}
                    period={bars.period}
                />
            ) : null}

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

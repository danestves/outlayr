import { LineChart } from "panelui-native/components/line-chart";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useSettingBool } from "@/contexts/display-settings-context";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDayMonth } from "@/domain/dates";
import { numberLocale } from "@/domain/money";
import type { NetWorthSeriesPoint } from "@/domain/net-worth-series";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_DRAW, compactMagnitude } from "@/theme/chart";
import { useColors } from "@/theme/use-colors";

const Y_TICKS = 2;

interface NetWorthCardProps {
    currency: string;
    debts: { owedToYou: number; youOwe: number } | null;
    onOpenDebts: () => void;
    series: readonly NetWorthSeriesPoint[];
    showCents: boolean;
}

/** Keeps zero in view when the line crosses it. */
function worthDomain(values: readonly number[]): [number, number] {
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for (const value of values) {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
    }
    if (!(Number.isFinite(minimum) && Number.isFinite(maximum))) {
        return [-1, 1];
    }
    if (minimum === maximum) {
        const padding = Math.max(Math.abs(minimum) * 0.1, 1);
        return [minimum - padding, maximum + padding];
    }
    const low = Math.min(0, minimum);
    const high = Math.max(0, maximum);
    const padding = (high - low) * 0.1;
    return [low - padding, high + padding];
}

export function NetWorthCard({ series, currency, debts, onOpenDebts, showCents }: NetWorthCardProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;

    const data = useMemo(
        () => series.map(({ date, exact, value }) => ({ date, exact: exact ? 1 : 0, value })),
        [series]
    );
    const domain = useMemo(() => worthDomain(data.map((point) => point.value)), [data]);

    if (data.length === 0) {
        return null;
    }

    const latest = data.at(-1) ?? { date: "", exact: 1, value: 0 };
    const [{ value: opening }] = data;
    const change = latest.value - opening;
    const summary = t(latest.exact === 1 ? "insights.netWorth.summary" : "insights.netWorth.summaryApproximate", {
        amount: formatSignedAmount(latest.value, currency, showCents, language),
        date: formatDayMonth(latest.date, language),
    });
    const tooltipDate = (datum: { date?: string | number | null; exact?: string | number | null }): string => {
        const date = formatDayMonth(String(datum.date ?? ""), language);
        return datum.exact === 0 ? `${date} · ${t("accounts.chart.approximate")}` : date;
    };

    return (
        <View className="w-full gap-1.5 px-5 pt-6">
            <View accessibilityLabel={summary} accessibilityRole="image" accessible testID="net-worth-summary">
                <MonoLabel>{t("insights.netWorth.heading")}</MonoLabel>
                <Text
                    adjustsFontSizeToFit
                    className="text-foreground text-hero font-mono tabular-nums"
                    numberOfLines={1}
                >
                    {formatSignedAmount(latest.value, currency, showCents, language)}
                </Text>
                <Text className={`text-footnote ${change < 0 ? "text-expense" : "text-income"}`}>
                    {t("insights.netWorth.change", {
                        amount: formatSignedAmount(change, currency, showCents, language),
                    })}
                </Text>
            </View>
            {debts === null ? null : (
                <Pressable accessibilityRole="button" className="self-start active:opacity-70" onPress={onOpenDebts}>
                    <Text className="text-footnote text-tint">
                        {[
                            t("debts.youOweAmount", {
                                amount: formatSignedAmount(debts.youOwe, currency, showCents, language),
                            }),
                            debts.owedToYou > 0
                                ? t("debts.overview.owedToYou", {
                                      amount: formatSignedAmount(debts.owedToYou, currency, showCents, language),
                                  })
                                : null,
                        ]
                            .filter((part) => part !== null)
                            .join(" · ")}
                        {"  ›"}
                    </Text>
                </Pressable>
            )}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="net-worth-chart">
                <LineChart
                    animationDuration={animated ? CHART_DRAW.durationMs : 0}
                    aspectRatio={2.4}
                    data={data}
                    domainDuration={animated ? CHART_DRAW.durationMs : 0}
                    xDataKey="date"
                    yDomain={domain}
                >
                    <LineChart.Grid rows={Y_TICKS} />
                    <LineChart.Area color={colors.tint} dataKey="value" opacity={0.12} />
                    <LineChart.Line color={colors.tint} dataKey="value" strokeWidth={2.5} />
                    <LineChart.XAxis format={tooltipDate} ticks={3} />
                    <LineChart.YAxis
                        format={(value) =>
                            compactMagnitude(value, numberLocale(language).decimal, (domain[1] - domain[0]) / Y_TICKS)
                        }
                        ticks={Y_TICKS}
                    />
                    <LineChart.Tooltip
                        formatValue={(value) => formatSignedAmount(value, currency, showCents, language)}
                        formatX={tooltipDate}
                    />
                </LineChart>
            </View>
        </View>
    );
}

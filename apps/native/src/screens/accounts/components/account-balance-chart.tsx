import type { RateTable } from "@outlayr/money/valuation";
import { LineChart } from "panelui-native/components/line-chart";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { useSettingBool } from "@/contexts/display-settings-context";
import { useNow } from "@/data/use-now";
import { accountBalanceSeries } from "@/domain/account-balance-series";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDayMonth } from "@/domain/dates";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { numberLocale } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_DRAW, compactMagnitude } from "@/theme/chart";
import { useColors } from "@/theme/use-colors";

const Y_TICKS = 2;

interface AccountBalanceChartProps {
    account: {
        currency: string;
        initialBalance: number;
        initialBalanceDate: Date;
    };
    cells: readonly PlottedCell[];
    now?: Date;
    rates: RateTable;
    showCents: boolean;
}

function balanceDomain(values: readonly number[]): [number, number] {
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
    const boundedMinimum = Math.min(0, minimum);
    const boundedMaximum = Math.max(0, maximum);
    const padding = (boundedMaximum - boundedMinimum) * 0.1;
    return [boundedMinimum - padding, boundedMaximum + padding];
}

export function AccountBalanceChart({ account, cells, now, rates, showCents }: AccountBalanceChartProps) {
    const clock = useNow();
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;
    const at = now ?? new Date(clock);
    const data = accountBalanceSeries(account, cells, rates, at).map(({ date, exact, value }) => ({
        date,
        exact: exact ? 1 : 0,
        value,
    }));
    const domain = balanceDomain(data.map((point) => point.value));
    const latest = data.at(-1) ?? { date: "", exact: 1, value: 0 };
    const summary = t(latest.exact === 1 ? "accounts.chart.summary" : "accounts.chart.summaryApproximate", {
        amount: formatSignedAmount(latest.value, account.currency, showCents, language),
        date: formatDayMonth(latest.date, language),
    });
    const tooltipDate = (datum: { date?: string | number | null; exact?: string | number | null }): string => {
        const date = formatDayMonth(String(datum.date ?? ""), language);
        return datum.exact === 0 ? `${date} · ${t("accounts.chart.approximate")}` : date;
    };

    return (
        <View className="w-full gap-2 pt-4">
            <View accessibilityLabel={summary} accessibilityRole="image" accessible testID="account-balance-summary">
                <MonoLabel>{t("accounts.chart.heading")}</MonoLabel>
            </View>
            <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID="account-balance-panel-chart"
            >
                <LineChart
                    animationDuration={animated ? CHART_DRAW.durationMs : 0}
                    aspectRatio={2.2}
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
                        formatValue={(value) => formatSignedAmount(value, account.currency, showCents, language)}
                        formatX={tooltipDate}
                    />
                </LineChart>
            </View>
        </View>
    );
}

import type { RateTable } from "@outlayr/money/valuation";
import { LineChart } from "panelui-native/components/line-chart";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { useSetting } from "@/contexts/display-settings-context";
import { useNow } from "@/data/use-now";
import { accountBalanceSeries } from "@/domain/account-balance-series";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDayMonth } from "@/domain/dates";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { numberLocale } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_DRAW, compactMagnitude, roundAxisDomain } from "@/theme/chart";
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

export function AccountBalanceChart({ account, cells, now, rates, showCents }: AccountBalanceChartProps) {
    const clock = useNow();
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const reduceMotion = useReducedMotion();
    const animated = useSetting("animatedCharts") && !reduceMotion;
    const at = now ?? new Date(clock);
    const data = accountBalanceSeries(account, cells, rates, at).map(({ date, exact, value }) => ({
        date,
        exact: exact ? 1 : 0,
        value,
    }));
    const latest = data.at(-1);
    if (!latest || data.length < 2) {
        return null;
    }
    const domain = roundAxisDomain(
        data.map((point) => point.value),
        Y_TICKS
    );
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

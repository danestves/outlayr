import { LineChart } from "panelui-native/components/line-chart";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { cn } from "@/components/tw";
import { Widget } from "@/components/widget-card";
import type { CategoryBreakdownEntry, InsightsMeasure } from "@/data/insights";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDayMonth } from "@/domain/dates";
import {
    insightsMeasureIsIncome,
    insightsMeasureIsPositive,
    insightsMeasureMagnitude,
    netTotal,
} from "@/domain/insights-measure";
import type { InsightsTotals } from "@/domain/insights-measure";
import { formatAmount, maskedAmount } from "@/domain/money";
import type { NetWorthSeriesPoint } from "@/domain/net-worth-series";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { MEASURE_KEY } from "../measure-label";

const TILES_SHOWN = 3;
const SPARK_RATIO = 5;

function useMoney(code: string, showCents: boolean) {
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const plain = (magnitude: number) =>
        hidden ? maskedAmount(code) : formatAmount(magnitude, code, showCents, language);
    const signed = (magnitude: number, positive: boolean) =>
        hidden ? maskedAmount(code) : `${positive ? "+" : "-"}${plain(magnitude)}`;
    return { plain, signed };
}

function percent(part: number, whole: number) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

interface MeasureWidgetProps {
    className?: string;
    code: string;
    count: number;
    entries: readonly CategoryBreakdownEntry[];
    measure: InsightsMeasure;
    onOpen: () => void;
    showCents: boolean;
    totals: InsightsTotals;
}

export function MeasureWidget({
    className,
    code,
    count,
    entries,
    measure,
    onOpen,
    showCents,
    totals,
}: MeasureWidgetProps) {
    const t = useTranslation();
    const colors = useColors();
    const money = useMoney(code, showCents);
    const title = t(MEASURE_KEY[measure]);
    const positive = insightsMeasureIsPositive(measure, totals);
    const figure = money.signed(insightsMeasureMagnitude(measure, totals), positive);
    const hint = t("insights.cashFlow.openHint");

    if (measure === "net") {
        const net = netTotal(totals);
        const over = net < 0;
        let unit = "";
        if (over) {
            unit = t("insights.widget.overIncome", { amount: money.plain(-net) });
        } else if (totals.income > 0) {
            unit = t("insights.widget.keptShare", { percent: percent(net, totals.income) });
        }
        return (
            <Widget
                accessibilityHint={hint}
                accessibilityLabel={`${title}, ${figure}, ${unit}`}
                className={className}
                figure={figure}
                onPress={onOpen}
                title={title}
                unit={unit}
                unitClass={over ? "text-danger" : "text-subtle"}
            >
                {totals.spent > 0 || totals.income > 0 ? (
                    <View className="gap-1.5">
                        <View className="h-1.5 flex-row gap-0.5 overflow-hidden rounded-full">
                            <View
                                style={{
                                    backgroundColor: over ? colors.danger : colors.foreground,
                                    flex: over ? 1 : totals.spent,
                                }}
                            />
                            {net > 0 ? <View style={{ backgroundColor: colors.income, flex: net }} /> : null}
                        </View>
                        {totals.income > 0 ? (
                            <View className="flex-row justify-between gap-2">
                                <MonoLabel className="text-micro" numberOfLines={1}>
                                    {`${t("insights.measure.spent")} ${percent(totals.spent, totals.income)}%`}
                                </MonoLabel>
                                {net > 0 ? (
                                    <MonoLabel className="text-micro text-income" numberOfLines={1}>
                                        {`${t("insights.cashFlow.kept")} ${percent(net, totals.income)}%`}
                                    </MonoLabel>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </Widget>
        );
    }

    const unit = t("insights.widget.entries", { count });
    const shown = entries.slice(0, TILES_SHOWN);
    return (
        <Widget
            accessibilityHint={hint}
            accessibilityLabel={[title, figure, unit, ...shown.map((entry) => entry.name)].join(", ")}
            className={className}
            figure={figure}
            figureClass={insightsMeasureIsIncome(measure) ? "text-income" : "text-foreground"}
            onPress={onOpen}
            title={title}
            unit={unit}
        >
            <View className={cn("flex-row", shown.length === TILES_SHOWN ? "justify-between" : "gap-3.5")}>
                {shown.map((entry) => (
                    <View className="items-center gap-1.25" key={entry.id}>
                        <CategoryIconTile
                            color={entry.color}
                            emoji={entry.emoji}
                            icon={entry.icon}
                            radius={8}
                            size={30}
                            type="solid"
                        />
                        <MonoLabel className="text-micro text-subtle" numberOfLines={1}>
                            {`${Math.round(entry.fraction * 100)}%`}
                        </MonoLabel>
                    </View>
                ))}
            </View>
        </Widget>
    );
}

interface NetWorthWidgetProps {
    currency: string;
    onOpen: () => void;
    series: readonly NetWorthSeriesPoint[];
    showCents: boolean;
}

export function NetWorthWidget({ currency, onOpen, series, showCents }: NetWorthWidgetProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const latest = series.at(-1);
    if (!latest) {
        return null;
    }
    const change = latest.value - series[0].value;
    const changeText = t("insights.netWorth.change", {
        amount: hidden ? maskedAmount(currency) : formatSignedAmount(change, currency, showCents, language),
    });
    const figure = hidden ? maskedAmount(currency) : formatSignedAmount(latest.value, currency, showCents, language);
    const summary = t(latest.exact ? "insights.netWorth.summary" : "insights.netWorth.summaryApproximate", {
        amount: figure,
        date: formatDayMonth(latest.date, language),
    });
    const tone = change < 0 ? colors.expense : colors.income;

    return (
        <Widget
            accessibilityLabel={`${summary} ${changeText}`}
            figure={figure}
            onPress={onOpen}
            title={t("insights.netWorth.heading")}
            unit={changeText}
            unitClass={change < 0 ? "text-expense" : "text-income"}
        >
            {series.length > 1 ? (
                <LineChart
                    accessible={false}
                    aspectRatio={SPARK_RATIO}
                    compact
                    data={series.map((point) => ({ date: point.date, value: point.value }))}
                    xDataKey="date"
                >
                    <LineChart.Line color={tone} dataKey="value" strokeWidth={2} />
                </LineChart>
            ) : null}
        </Widget>
    );
}

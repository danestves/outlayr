import { startOfDay } from "@outlayr/money/calendar";
import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { FontScaleCapContext, Text } from "@/components/text";
import { cn } from "@/components/tw";
import { formatSignedAmount } from "@/domain/account-display";
import { formatWeekdayDay, weekdayInitial } from "@/domain/dates";
import { amountParts, withCurrencySymbol } from "@/domain/money";
import type { BarPeriod, PeriodBar } from "@/domain/period-bars";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_BAR, compactMagnitude } from "@/theme/chart";

const WEEK_PLOT = 44;
const WEEK_BAR_WIDTH = 22;
const MONTH_PLOT = 48;
const MONTH_BAR_RADIUS = 2;
const AXIS_DAYS = new Set([1, 8, 15, 22]);
const AXIS_CLEARANCE = 3;

function BarMark({
    bar,
    income,
    peak,
    plot,
    radius,
}: {
    bar: PeriodBar;
    income: boolean;
    peak: number;
    plot: number;
    radius: number;
}) {
    const value = bar.amount > 0 ? bar.amount : bar.due;
    if (value <= 0 || peak <= 0) {
        return null;
    }
    const height = Math.max(CHART_BAR.minHeight, (value / peak) * plot);
    if (bar.amount > 0) {
        return (
            <View
                className={income ? "bg-income" : "bg-foreground"}
                style={{ borderRadius: radius, height, width: "100%" }}
            />
        );
    }
    return (
        <View className="border-future border border-dashed" style={{ borderRadius: radius, height, width: "100%" }} />
    );
}

interface LogPeriodBarsProps {
    bars: readonly PeriodBar[];
    code: string;
    income: boolean;
    nowMs: number;
    period: BarPeriod;
}

export function LogPeriodBars({ bars, code, income, nowMs, period }: LogPeriodBarsProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const today = startOfDay(new Date(nowMs));
    const peak = Math.max(0, ...bars.map((bar) => Math.max(bar.amount, bar.due)));
    const format = (amount: number) => formatSignedAmount(income ? amount : -amount, code, false, language);
    const compact = (amount: number) => {
        const parts = amountParts(amount, code, false, language);
        return `${income ? "" : "-"}${withCurrencySymbol(parts, compactMagnitude(amount, parts.locale.decimal))}`;
    };
    const spoken = hidden
        ? t("log.amounts.hidden")
        : bars
              .flatMap((bar) => {
                  const day = formatWeekdayDay(bar.day, language);
                  if (bar.amount > 0) {
                      return [`${day}: ${format(bar.amount)}`];
                  }
                  return bar.due > 0 ? [`${day}: ${format(bar.due)}, ${t("log.upcoming.heading")}`] : [];
              })
              .join(", ") || format(0);

    return (
        <FontScaleCapContext value={LARGEST_STANDARD_FONT_SCALE}>
            <View accessibilityLabel={spoken} accessible className="pt-3.5">
                {period === "week" ? (
                    <View className="flex-row">
                        {bars.map((bar) => {
                            const isToday = bar.day.getTime() === today.getTime();
                            const value = bar.amount > 0 ? bar.amount : bar.due;
                            return (
                                <View className="flex-1 items-center gap-1" key={bar.day.getTime()}>
                                    <MonoLabel
                                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                                        className="text-micro text-subtle"
                                    >
                                        {weekdayInitial(bar.day, language)}
                                    </MonoLabel>
                                    <Text
                                        className={cn(
                                            "font-sans-medium text-callout tabular-nums",
                                            isToday ? "text-tint" : "text-foreground"
                                        )}
                                    >
                                        {bar.day.getDate()}
                                    </Text>
                                    <View className="justify-end" style={{ height: WEEK_PLOT, width: WEEK_BAR_WIDTH }}>
                                        <BarMark
                                            bar={bar}
                                            income={income}
                                            peak={peak}
                                            plot={WEEK_PLOT}
                                            radius={CHART_BAR.radius}
                                        />
                                    </View>
                                    <MonoLabel
                                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                                        className="text-micro text-subtle"
                                        numberOfLines={1}
                                    >
                                        {value > 0 && !hidden ? compact(value) : " "}
                                    </MonoLabel>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View className="gap-1">
                        <MonoLabel
                            maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                            className="text-micro text-subtle"
                        >
                            {peak > 0 && !hidden ? compact(peak) : " "}
                        </MonoLabel>
                        <View
                            className="border-border flex-row items-end gap-0.75 border-b"
                            style={{ height: MONTH_PLOT }}
                        >
                            {bars.map((bar) => (
                                <View className="flex-1" key={bar.day.getTime()}>
                                    <BarMark
                                        bar={bar}
                                        income={income}
                                        peak={peak}
                                        plot={MONTH_PLOT}
                                        radius={MONTH_BAR_RADIUS}
                                    />
                                </View>
                            ))}
                        </View>
                        <View className="flex-row gap-0.75">
                            {bars.map((bar) => {
                                const date = bar.day.getDate();
                                const isToday = bar.day.getTime() === today.getTime();
                                const labelled =
                                    isToday ||
                                    (AXIS_DAYS.has(date) && Math.abs(date - today.getDate()) >= AXIS_CLEARANCE);
                                return (
                                    <View className="flex-1 items-center" key={bar.day.getTime()}>
                                        {labelled ? (
                                            <View className="w-7 items-center">
                                                <MonoLabel
                                                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                                                    className={cn("text-micro", isToday ? "text-tint" : "text-subtle")}
                                                >
                                                    {String(date)}
                                                </MonoLabel>
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </View>
        </FontScaleCapContext>
    );
}

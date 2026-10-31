import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { FontScaleCapContext, Text } from "@/components/text";
import { cn } from "@/components/tw";
import { amountParts, formatAmount, withCurrencySymbol } from "@/domain/money";
import { isShort } from "@/domain/year-plan";
import type { MonthProjection } from "@/domain/year-plan";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_BAR, compactMagnitude } from "@/theme/chart";

import { monthName, monthShort } from "../plan-copy";

const PLOT = 96;
const RADIUS = 2;

/** What is left each month: solid once a month closes, an outline while it is still a plan, red below the line. */
export function MonthBars({ currency, months }: { currency: string; months: readonly MonthProjection[] }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const peak = Math.max(0, ...months.map((month) => month.left));
    const trough = Math.max(0, ...months.map((month) => -month.left));
    const span = peak + trough || 1;
    const above = (peak / span) * PLOT;
    const below = PLOT - above;
    const compact = (amount: number) => {
        const parts = amountParts(Math.abs(amount), currency, false, language);
        return `${amount < 0 ? "-" : ""}${withCurrencySymbol(parts, compactMagnitude(Math.abs(amount), parts.locale.decimal))}`;
    };
    const spoken = hidden
        ? undefined
        : months
              .map(
                  (month) =>
                      `${monthName(month.key, language)}: ${formatAmount(Math.abs(month.left), currency, false, language)} ${month.left < 0 ? t("budgets.plan.suffix.short") : t("budgets.suffix.left")}`
              )
              .join(", ");

    return (
        <FontScaleCapContext value={LARGEST_STANDARD_FONT_SCALE}>
            <View accessibilityLabel={spoken} accessible className="gap-1.5">
                <View className="flex-row gap-1">
                    {months.map((month) => (
                        <View className="flex-1 items-center" key={month.key}>
                            <MonoLabel
                                className={cn("text-micro", month.status === "current" ? "text-tint" : "text-subtle")}
                                maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                            >
                                {monthShort(month.key, language).slice(0, 1)}
                            </MonoLabel>
                        </View>
                    ))}
                </View>
                <View>
                    <View className="flex-row items-end gap-1" style={{ height: above }}>
                        {months.map((month) => (
                            <View className="flex-1" key={month.key}>
                                {month.left > 0 ? <Bar height={(month.left / span) * PLOT} month={month} /> : null}
                            </View>
                        ))}
                    </View>
                    <View className="bg-border h-px" />
                    <View className="flex-row items-start gap-1" style={{ height: below }}>
                        {months.map((month) => (
                            <View className="flex-1" key={month.key}>
                                {month.left < 0 ? <Bar height={(-month.left / span) * PLOT} month={month} /> : null}
                            </View>
                        ))}
                    </View>
                </View>
                <View className="flex-row gap-1">
                    {months.map((month) => (
                        <View className="flex-1 items-center" key={month.key}>
                            <Text
                                adjustsFontSizeToFit
                                className={cn(
                                    "font-mono text-[9px] tabular-nums",
                                    isShort(month) ? "text-over-budget" : "text-subtle"
                                )}
                                maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                                minimumFontScale={0.6}
                                numberOfLines={1}
                            >
                                {hidden ? " " : compact(month.left)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </FontScaleCapContext>
    );
}

function Bar({ height, month }: { height: number; month: MonthProjection }) {
    const shown = Math.max(CHART_BAR.minHeight, height);
    if (month.status === "closed") {
        return <View className="bg-foreground" style={{ borderRadius: RADIUS, height: shown, width: "100%" }} />;
    }
    return (
        <View
            className={cn("border border-dashed", month.left < 0 ? "border-over-budget" : "border-future")}
            style={{ borderRadius: RADIUS, height: shown, width: "100%" }}
        />
    );
}

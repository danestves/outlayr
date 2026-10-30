import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDayMonth } from "@/domain/dates";
import type { NetWorthSeriesPoint } from "@/domain/net-worth-series";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

interface NetWorthLineProps {
    currency: string;
    onOpen: () => void;
    series: readonly NetWorthSeriesPoint[];
    showCents: boolean;
}

export function NetWorthLine({ currency, onOpen, series, showCents }: NetWorthLineProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const latest = series.at(-1);
    if (!latest) {
        return null;
    }
    const change = latest.value - series[0].value;
    const changeText = t("insights.netWorth.change", {
        amount: formatSignedAmount(change, currency, showCents, language),
    });
    const summary = t(latest.exact ? "insights.netWorth.summary" : "insights.netWorth.summaryApproximate", {
        amount: formatSignedAmount(latest.value, currency, showCents, language),
        date: formatDayMonth(latest.date, language),
    });

    return (
        <Pressable
            accessibilityLabel={`${summary} ${changeText}`}
            accessibilityRole="button"
            className="mx-5 mt-8 flex-row items-center gap-2.5 pt-3 active:opacity-70"
            onPress={onOpen}
            style={{ borderTopColor: colors.border, borderTopWidth: 1.3 }}
        >
            <MonoLabel className="flex-1" numberOfLines={1}>
                {t("insights.netWorth.heading")}
            </MonoLabel>
            <View className="shrink items-end">
                <Text className="font-sans-semibold text-callout text-foreground tabular-nums" numberOfLines={1}>
                    {formatSignedAmount(latest.value, currency, showCents, language)}
                </Text>
                <Text className={`text-footnote ${change < 0 ? "text-expense" : "text-income"}`} numberOfLines={1}>
                    {changeText}
                </Text>
            </View>
            <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={15} strokeWidth={2.2} />
        </Pressable>
    );
}

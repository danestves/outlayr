import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { addMonths } from "@outlayr/money/calendar";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useMonthRecap } from "@/data/use-month-recap";
import { monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { previousMonth, recapMonthKey } from "@/domain/recap-month";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function RecapRow({ nowMs }: { nowMs: number }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const code = useGlobalCurrency(db);
    const month = previousMonth(new Date(nowMs));
    const recap = useMonthRecap(db, nowMs, month);

    if (recap.entries === 0) {
        return null;
    }

    const amount = formatAmount(recap.spent, code, showCents, language);
    const change = recap.spentChange;
    const summary =
        change === null
            ? t("insights.recap.rowSummaryFirst", { amount })
            : t("insights.recap.rowSummary", {
                  amount,
                  change: `${change > 0 ? "+" : ""}${Math.round(change * 100)}%`,
                  previous: monthLongTitle(addMonths(month, -1), language),
              });
    const title = t("insights.recap.rowTitle", { month: monthLongTitle(month, language) });

    return (
        <Pressable
            accessibilityHint={summary}
            accessibilityLabel={title}
            accessibilityRole="button"
            className="border-border mb-3 flex-row items-center gap-3 border-b pb-3 active:opacity-60"
            onPress={() => router.push({ params: { month: recapMonthKey(month) }, pathname: "/recap" })}
        >
            <View className="flex-1 gap-0.5">
                <Text className="font-sans-semibold text-body text-foreground">{title}</Text>
                <Text className="text-footnote text-muted" numberOfLines={1}>
                    {summary}
                </Text>
            </View>
            <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
        </Pressable>
    );
}

import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useWeekRecap } from "@/data/use-week-recap";
import { formatSentenceDate } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { previousWeek, recapWeekKey } from "@/domain/recap-week";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function WeekRecapRow({ nowMs }: { nowMs: number }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const code = useGlobalCurrency(db);
    const firstWeekday = useSetting("firstWeekday");
    const week = previousWeek(new Date(nowMs), firstWeekday);
    const recap = useWeekRecap(db, nowMs, week);

    if (recap.entries === 0) {
        return null;
    }

    const amount = formatAmount(recap.spent, code, showCents, language);
    const change = recap.spentChange;
    const summary =
        change === null
            ? t("insights.recap.rowSummaryFirst", { amount })
            : t("insights.weekRecap.rowSummary", {
                  amount,
                  change: `${change > 0 ? "+" : ""}${Math.round(change * 100)}%`,
              });
    const title = t("insights.weekRecap.eyebrow", { date: formatSentenceDate(week, language) });

    return (
        <Pressable
            accessibilityHint={summary}
            accessibilityLabel={title}
            accessibilityRole="button"
            className="border-border mb-3 flex-row items-center gap-3 border-b pb-3 active:opacity-60"
            onPress={() => router.push({ params: { week: recapWeekKey(week) }, pathname: "/recap/week" })}
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

import { addMonths } from "@outlayr/money/calendar";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroNumber } from "@/components/amount-text";
import { CloseToolbar } from "@/components/close-toolbar";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useMonthRecap } from "@/data/use-month-recap";
import { useNow } from "@/data/use-now";
import { monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { recapMonth, recapMonthKey } from "@/domain/recap-month";
import { useLanguage, useTranslation } from "@/i18n/context";
import { InsightsMovers } from "@/screens/insights/components/insights-movers";

function changeTone(change: number | null): string {
    if (change === null || change === 0) {
        return "text-foreground";
    }
    return change > 0 ? "text-danger" : "text-income";
}

const GRID_COLUMNS = 7;
const GRID_GAP = 6;
const GUTTER = 20;

function DaysGrid({ days, label }: { days: readonly boolean[]; label: string }) {
    const { width } = useWindowDimensions();
    const cell = Math.floor((width - GUTTER * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
    return (
        <View accessibilityLabel={label} accessible className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {days.map((logged, index) => (
                <View
                    className={cn("rounded-md", logged ? "bg-foreground" : "bg-border")}
                    key={index}
                    style={{ height: cell, width: cell }}
                />
            ))}
        </View>
    );
}

export function Recap({ month: monthKey }: { month: string | undefined }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();
    const { bottom } = useSafeAreaInsets();
    const { showCents } = useDisplaySettings().state;
    const currency = useGlobalCurrency(db);
    const nowMs = useNow();
    const month = recapMonth(monthKey, new Date(nowMs));
    const recap = useMonthRecap(db, nowMs, month);
    const monthName = monthLongTitle(month, language);
    const money = (amount: number) => formatAmount(Math.abs(amount), currency, showCents, language);

    if (recap.entries === 0) {
        return (
            <>
                <CloseToolbar placement="left" />
                <View className="bg-background flex-1 items-center justify-center px-8">
                    <Text className="text-subtitle text-muted text-center">
                        {t("insights.recap.empty", { month: monthName })}
                    </Text>
                </View>
            </>
        );
    }

    const change = recap.spentChange;
    const changeLabel =
        change === null ? t("insights.movers.new") : `${change > 0 ? "+" : ""}${Math.round(change * 100)}%`;
    const inflation = recap.inflation ?? 0;

    return (
        <>
            <CloseToolbar placement="left" />
            <View className="bg-background flex-1">
                <ScrollView
                    contentContainerClassName="px-5 pt-6 pb-6"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                >
                    <MonoLabel>{t("insights.recap.eyebrow", { month: monthName })}</MonoLabel>
                    <View className="pt-0.5">
                        <HeroNumber
                            amount={recap.spent}
                            brandFace
                            code={currency}
                            showCents={showCents}
                            sign="-"
                            size={40}
                        />
                    </View>
                    {inflation === 0 ? null : (
                        <Text className="text-footnote text-muted pt-0.5">
                            {t(inflation > 0 ? "insights.recap.inflationMore" : "insights.recap.inflationLess", {
                                amount: money(inflation),
                            })}
                        </Text>
                    )}

                    <View className="border-border mt-5 flex-row border-t pt-3">
                        <View className="flex-1 gap-0.5">
                            <MonoLabel>
                                {t("insights.recap.versus", { month: monthLongTitle(addMonths(month, -1), language) })}
                            </MonoLabel>
                            <Text className={cn("font-sans-semibold text-title tabular-nums", changeTone(change))}>
                                {changeLabel}
                            </Text>
                        </View>
                        <View className="flex-1 gap-0.5">
                            <MonoLabel>{t("insights.recap.daysLogged")}</MonoLabel>
                            <Text className="font-sans-semibold text-title text-foreground tabular-nums">
                                {t("insights.recap.daysOf", { logged: recap.daysLogged, total: recap.daysInMonth })}
                            </Text>
                        </View>
                    </View>

                    <View className="pt-6">
                        <InsightsMovers
                            code={currency}
                            measure="spent"
                            movers={recap.movers}
                            priorLabel={monthLongTitle(addMonths(month, -1), language)}
                        />
                    </View>

                    <View className="pt-6">
                        <DaysGrid
                            days={recap.days}
                            label={t("insights.recap.gridLabel", {
                                logged: recap.daysLogged,
                                total: recap.daysInMonth,
                            })}
                        />
                    </View>
                </ScrollView>
                <View className="px-5 pt-2" style={{ paddingBottom: Math.max(bottom, 16) }}>
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() =>
                            router.push({ params: { month: recapMonthKey(month) }, pathname: "/recap/share" })
                        }
                        size="md"
                        variant="primary"
                    >
                        {t("insights.recap.share", { month: monthName })}
                    </Button>
                </View>
            </View>
        </>
    );
}

import { addDays } from "@outlayr/money/calendar";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroNumber } from "@/components/amount-text";
import { CloseToolbar } from "@/components/close-toolbar";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useNow } from "@/data/use-now";
import { useWeekRecap } from "@/data/use-week-recap";
import { formatSentenceDate, weekdayInitial } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { recapWeek } from "@/domain/recap-week";
import { useLanguage, useTranslation } from "@/i18n/context";
import { InsightsMovers } from "@/screens/insights/components/insights-movers";

const BAR_HEIGHT = 88;
const EMPTY_BAR = 4;

function changeTone(change: number | null): string {
    if (change === null || change === 0) {
        return "text-foreground";
    }
    return change > 0 ? "text-danger" : "text-income";
}

function DayBars({
    daily,
    days,
    label,
    start,
}: {
    daily: readonly number[];
    days: readonly boolean[];
    label: string;
    start: Date;
}) {
    const { language } = useLanguage();
    const peak = Math.max(...daily, 0);
    return (
        <View accessibilityLabel={label} accessible className="flex-row gap-2">
            {days.map((logged, index) => {
                const spent = daily[index] ?? 0;
                const height = peak > 0 ? Math.max(EMPTY_BAR, Math.round((spent / peak) * BAR_HEIGHT)) : EMPTY_BAR;
                return (
                    <View className="flex-1 items-center gap-1.5" key={index}>
                        <View className="w-full justify-end" style={{ height: BAR_HEIGHT }}>
                            <View
                                className={cn(
                                    "w-full rounded-sm",
                                    logged ? "bg-foreground" : "border-border border border-dashed"
                                )}
                                style={{ height: logged ? height : EMPTY_BAR }}
                            />
                        </View>
                        <Text className="text-label text-muted font-mono">
                            {weekdayInitial(addDays(start, index), language)}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

export function WeekRecap({ week: weekKey }: { week: string | undefined }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();
    const { bottom } = useSafeAreaInsets();
    const { showCents } = useDisplaySettings().state;
    const currency = useGlobalCurrency(db);
    const firstWeekday = useSetting("firstWeekday");
    const nowMs = useNow();
    const week = recapWeek(weekKey, new Date(nowMs), firstWeekday);
    const recap = useWeekRecap(db, nowMs, week);
    const quiet = recap.entries === 0;
    const priorLabel = t("insights.weekRecap.priorLabel");
    const change = recap.spentChange;
    const changeLabel =
        change === null ? t("insights.movers.new") : `${change > 0 ? "+" : ""}${Math.round(change * 100)}%`;

    return (
        <>
            <CloseToolbar placement="left" />
            <View className="bg-background flex-1">
                <ScrollView
                    contentContainerClassName="px-5 pt-6 pb-6"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                >
                    <MonoLabel>
                        {t("insights.weekRecap.eyebrow", { date: formatSentenceDate(week, language) })}
                    </MonoLabel>
                    {quiet ? (
                        <>
                            <Text className="font-sans-bold text-foreground pt-1 text-[28px] leading-[33px]">
                                {t("insights.weekRecap.quietTitle")}
                            </Text>
                            {recap.priorSpent > 0 ? (
                                <Text className="text-footnote text-muted pt-1.5">
                                    {t("insights.weekRecap.quietBody", {
                                        amount: formatAmount(recap.priorSpent, currency, showCents, language),
                                    })}
                                </Text>
                            ) : null}
                        </>
                    ) : (
                        <>
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
                            <View className="border-border mt-5 flex-row border-t pt-3">
                                <View className="flex-1 gap-0.5">
                                    <MonoLabel>{t("insights.movers.versus", { label: priorLabel })}</MonoLabel>
                                    <Text
                                        className={cn("font-sans-semibold text-title tabular-nums", changeTone(change))}
                                    >
                                        {changeLabel}
                                    </Text>
                                </View>
                                <View className="flex-1 gap-0.5">
                                    <MonoLabel>{t("insights.recap.daysLogged")}</MonoLabel>
                                    <Text className="font-sans-semibold text-title text-foreground tabular-nums">
                                        {t("insights.recap.daysOf", {
                                            logged: recap.daysLogged,
                                            total: recap.days.length,
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    <View className="pt-6">
                        <DayBars
                            daily={recap.daily}
                            days={recap.days}
                            label={t("insights.weekRecap.chartLabel", { logged: recap.daysLogged })}
                            start={week}
                        />
                    </View>

                    {quiet ? null : (
                        <View className="pt-6">
                            <InsightsMovers
                                code={currency}
                                measure="spent"
                                movers={recap.movers}
                                priorLabel={priorLabel}
                            />
                        </View>
                    )}
                </ScrollView>
                <View className="px-5 pt-2" style={{ paddingBottom: Math.max(bottom, 16) }}>
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() => router.push("/transactions/create")}
                        size="md"
                        variant="primary"
                    >
                        {t(quiet ? "insights.weekRecap.addQuiet" : "insights.weekRecap.add")}
                    </Button>
                </View>
            </View>
        </>
    );
}

import { SectionList } from "@legendapp/list/section-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { MeasureCellAmount } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { MonoLabel } from "@/components/mono-label";
import { ROW_TYPE } from "@/components/row-type";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useCategoryMeta } from "@/data/categories";
import { categoryBreakdownWithin } from "@/data/insights";
import { useWindowTransactions } from "@/data/insights-transactions";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useInsights } from "@/data/use-insights";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { formatMonthHeader } from "@/domain/dates";
import { groupByMonth } from "@/domain/day-sections";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";

import { InsightsWindow } from "./components/insights-window";
import { periodOf } from "./periods";

/** What sits behind one Cash flow row, in the window that row was read in. */
export function CashFlowEntries() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { displayCurrency: currency, rates } = useValuation(db);
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const params = useLocalSearchParams<{ categoryId: string; income: string; offset?: string }>();
    const { categoryId } = params;
    const income = params.income === "true";
    const period = periodOf(useSetting("insightsTimeFrame"));
    const calendar = {
        firstDayOfMonth: useSetting("firstDayOfMonth"),
        firstWeekday: useSetting("firstWeekday"),
    };
    const [offset, setOffset] = useState(() => Math.min(0, Number(params.offset) || 0));
    const result = useInsights(db, nowMs, period, "spent", offset, calendar);
    const name = useCategoryMeta(db).get(categoryId)?.name;
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);

    const entry = categoryBreakdownWithin(
        result.rows,
        result.categoriesById,
        income ? "income" : "spent",
        { end: result.end.getTime(), start: result.start.getTime() },
        new Date(nowMs)
    ).find((candidate) => candidate.id === categoryId);
    const magnitude = entry?.amount ?? 0;
    const over = result.spent > result.income;
    // The basis of the row this screen opened from, so the two percentages agree.
    const basis = !income && over ? result.spent : result.income;

    const rows = useWindowTransactions(db, {
        categoryId,
        end: result.end,
        income,
        nowMs,
        start: result.start,
    }).filter((row) => !goesWithPendingDelete(row, pendingId));
    const sections = groupByMonth(rows, currency, rates);
    const count = sections.reduce((total, section) => total + section.data.length, 0);

    return (
        <>
            <ScreenHeader title={name ?? undefined} />
            <SectionList
                className="bg-background"
                contentContainerClassName="px-5 pb-8"
                contentInsetAdjustmentBehavior="automatic"
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View className="pt-2">
                        <View className="flex-row">
                            <InsightsWindow
                                atCurrent={result.atCurrent}
                                atEarliest={result.atEarliest}
                                label={result.label}
                                onOffset={setOffset}
                            />
                        </View>
                        <View className="bg-border mt-3.5 h-px w-full" />
                        <View className="flex-row gap-3.5 py-2.5">
                            <View className="flex-1 gap-0.75">
                                <MonoLabel>{t(income ? "insights.cashFlow.in" : "insights.cashFlow.out")}</MonoLabel>
                                <MeasureCellAmount
                                    code={currency}
                                    income={income}
                                    magnitude={magnitude}
                                    positive={income}
                                    showCents={showCents}
                                />
                            </View>
                            <View className="gap-0.75">
                                <MonoLabel>
                                    {t(!income && over ? "insights.cashFlow.ofOut" : "insights.cashFlow.ofIncome")}
                                </MonoLabel>
                                <Text className={cn(ROW_TYPE.cell, "text-foreground tabular-nums")}>
                                    {`${basis > 0 ? Math.round((magnitude / basis) * 100) : 0}%`}
                                </Text>
                            </View>
                            <View className="gap-0.75">
                                <MonoLabel>{t("insights.cashFlow.entries")}</MonoLabel>
                                <Text className={cn(ROW_TYPE.cell, "text-foreground tabular-nums")}>{count}</Text>
                            </View>
                        </View>
                    </View>
                }
                recycleItems
                renderItem={({ item }) => (
                    <TransactionRow
                        currency={currency}
                        dated
                        menuItems={openRowActions(item, false)}
                        onPress={(id) => router.push(`/transactions/${id}`)}
                        rates={rates}
                        transaction={item}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <DaySectionHeader label={formatMonthHeader(section.day, language)} section={section} />
                )}
                sections={sections}
                stickySectionHeadersEnabled={false}
            />
        </>
    );
}

import AddIcon from "@hugeicons-pro/core-stroke-rounded/Add01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { closedWindowsBefore, EVERY_SCOPE, spendPerWindow, typicalOf } from "@outlayr/money/budget-typical";
import { BUDGET_TYPE, periodsBackTo, shiftWindow, startOfPeriod, windowEndMs } from "@outlayr/money/budget-window";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { earliestDate, useBudgetContributions, useExpenseContributions, usePerCategoryBudgets } from "@/data/budgets";
import { useCategoryMeta } from "@/data/categories";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { budgetWindowLabel } from "@/domain/budget-math";
import { monthAbbrev, monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useLeaveWhenGone } from "@/hooks/use-leave-when-gone";
import { useLanguage, useTranslation } from "@/i18n/context";
import { BudgetPeriodStepper } from "@/screens/budgets/components/budget-period-stepper";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { useLimitFlow } from "./limit-flow";

const BARS = 6;
const BAR_HEIGHT = 96;
const BAR_FLOOR = 2;
const BAR_WASH = 0.18;
const FALLBACK_COLOR = "#767676";

/** What a category took in a month and the months before it, and the way to limit it while no limit covers it. */
export function CategoryDetail({ categoryId, initialMonthOffset }: { categoryId: string; initialMonthOffset: number }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const colors = useColors();
    const nowMs = useNow();
    const currency = useGlobalCurrency(db);
    const { rates } = useValuation(db);
    const firstDayOfMonth = useSetting("firstDayOfMonth");
    const firstWeekday = useSetting("firstWeekday");
    const meta = useCategoryMeta(db).get(categoryId);
    const contributions = useExpenseContributions(db, nowMs);
    const allBudgets = usePerCategoryBudgets(db, nowMs, contributions);
    const limits = useLimitFlow({ allBudgets, contributions, currency, nowMs });
    const [monthOffset, setMonthOffset] = useState(initialMonthOffset);

    const thisMonth = startOfPeriod(new Date(nowMs), BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday });
    const current = shiftWindow(thisMonth, BUDGET_TYPE.month, monthOffset);
    const { start } = current;
    const live = monthOffset === 0;
    const windows = [
        current,
        ...closedWindowsBefore({ current, since: earliestDate(contributions), type: BUDGET_TYPE.month }),
    ];
    const totals = spendPerWindow(contributions, windows);
    const series = totals.get(categoryId) ?? [];
    const spent = series[0] ?? 0;
    const everything = totals.get(EVERY_SCOPE)?.[0] ?? 0;
    const typical = typicalOf(series.slice(1));
    const entries = useBudgetContributions(db, categoryId, start, windowEndMs(current, nowMs));
    const limited = allBudgets.find((budget) => budget.categoryId === categoryId);

    // Once a limit covers it, the budget's own detail is this category's running month.
    useLeaveWhenGone(live && limited !== undefined, () => router.replace(`/balances/${limited?.id}`));

    const name = meta?.name ?? t("budgets.name.default");
    const period =
        firstDayOfMonth === 1 ? monthLongTitle(start, language) : budgetWindowLabel(current, BUDGET_TYPE.month);
    const percent = everything > 0 ? Math.round((spent / everything) * 100) : 0;
    const bars = windows
        .slice(0, BARS)
        .map((window, index) => ({ amount: series[index] ?? 0, start: window.start }))
        .toReversed();
    const peak = Math.max(...bars.map((bar) => bar.amount), 1);

    return (
        <>
            <ScrollView
                className="bg-background"
                contentContainerClassName="px-5 pt-2 pb-safe-offset-10"
                contentInsetAdjustmentBehavior="automatic"
            >
                <View className="pb-3">
                    <BudgetPeriodStepper
                        label={period}
                        maxBack={periodsBackTo(thisMonth, BUDGET_TYPE.month, earliestDate(contributions))}
                        offset={monthOffset}
                        onStep={setMonthOffset}
                        type={BUDGET_TYPE.month}
                        window={current}
                    />
                </View>
                <MonoLabel>{limited ? t("balances.spent") : t("balances.noLimit")}</MonoLabel>
                <HeroNumber amount={spent} code={currency} showCents={showCents} sign="" />
                <Text className="text-muted text-subtitle pt-1">
                    {t("balances.share", { percent: spent > 0 && percent === 0 ? "<1" : String(percent) })}
                </Text>

                {bars.length > 1 ? (
                    <>
                        <View className="flex-row items-baseline justify-between pt-7 pb-3">
                            <MonoLabel>{t("balances.category.lately", { months: bars.length })}</MonoLabel>
                            {typical === null ? null : (
                                <MonoLabel>
                                    {t("budgets.sheet.typical", {
                                        amount: formatAmount(typical, currency, false, language),
                                    })}
                                </MonoLabel>
                            )}
                        </View>
                        <View
                            accessibilityLabel={bars
                                .map(
                                    (bar) =>
                                        `${monthLongTitle(bar.start, language)}: ${formatAmount(bar.amount, currency, false, language)}`
                                )
                                .join(", ")}
                            accessible
                            className="flex-row items-end gap-2"
                            style={{ height: BAR_HEIGHT }}
                        >
                            {bars.map((bar) => (
                                <View
                                    className="flex-1 rounded-sm"
                                    key={bar.start.getTime()}
                                    style={{
                                        backgroundColor:
                                            bar.start.getTime() === start.getTime()
                                                ? colors.foreground
                                                : withAlpha(colors.foreground, BAR_WASH),
                                        height: Math.max(BAR_FLOOR, (bar.amount / peak) * BAR_HEIGHT),
                                    }}
                                />
                            ))}
                        </View>
                        <View className="flex-row gap-2 pt-1.5">
                            {bars.map((bar) => (
                                <MonoLabel
                                    className={cn(
                                        "flex-1 text-center",
                                        bar.start.getTime() === start.getTime() && "text-foreground"
                                    )}
                                    key={bar.start.getTime()}
                                >
                                    {monthAbbrev(bar.start, language)}
                                </MonoLabel>
                            ))}
                        </View>
                    </>
                ) : null}

                {limited ? null : (
                    <View className="pt-7">
                        <MonoLabel>{t("balances.category.limit")}</MonoLabel>
                        <Pressable
                            accessibilityRole="button"
                            className="border-border mt-2 flex-row items-center gap-3 border-y py-3 active:opacity-60"
                            onPress={() =>
                                limits.openLimit({
                                    categoryId,
                                    color: meta?.color ?? FALLBACK_COLOR,
                                    emoji: meta?.emoji ?? null,
                                    icon: meta?.icon ?? null,
                                    limit: null,
                                    name,
                                    type: BUDGET_TYPE.month,
                                })
                            }
                        >
                            <HugeiconsIcon color={colors.tint} icon={AddIcon} size={18} strokeWidth={2} />
                            <Text className="text-tint text-body">{t("balances.category.addLimit")}</Text>
                        </Pressable>
                    </View>
                )}

                {entries.length ? (
                    <View className="pt-7">
                        <View className="flex-row items-baseline justify-between pb-1">
                            <MonoLabel>{t("budgets.detail.transactions")}</MonoLabel>
                            <MonoLabel>{String(entries.length)}</MonoLabel>
                        </View>
                        {entries.map((entry) => (
                            <TransactionRow
                                currency={currency}
                                key={entry.id}
                                onPress={(id) => router.push(`/transactions/${id}`)}
                                rates={rates}
                                transaction={entry}
                            />
                        ))}
                    </View>
                ) : null}
            </ScrollView>
            <ScreenHeader title={name} />
            {limits.sheets}
        </>
    );
}

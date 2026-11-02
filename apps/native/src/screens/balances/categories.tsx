import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE, periodsBackTo, shiftWindow, startOfPeriod } from "@outlayr/money/budget-window";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { Easing, FadeOut, LinearTransition } from "react-native-reanimated";

import { HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings, useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import type { CategoryBudgetView, MainBudgetView } from "@/data/budgets";
import { compareBudgetSeverity, earliestDate, useBurndown, useBurndowns } from "@/data/budgets";
import { useCategoryMeta } from "@/data/categories";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { unlimitedSpend } from "@/domain/balances";
import type { UnlimitedCategory } from "@/domain/balances";
import { dominantCategory } from "@/domain/budget-dominant";
import { budgetTimeLeftLabel } from "@/domain/budget-math";
import { monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { budgetMenuItems } from "@/lib/budget-actions";
import { BudgetBurndownHero } from "@/screens/budgets/components/budget-burndown-hero";
import { BudgetCard, NewBudgetCell } from "@/screens/budgets/components/budget-card";
import { BudgetEmptyState } from "@/screens/budgets/components/budget-empty-state";
import type { LimitTarget } from "@/screens/budgets/components/budget-limit-body";
import { BudgetPeriodStepper } from "@/screens/budgets/components/budget-period-stepper";
import { BudgetRow } from "@/screens/budgets/components/budget-row";
import { pairs } from "@/screens/budgets/pairs";

import { BalancesViewToggle } from "./view-toggle";
import type { BalancesViewToggleProps } from "./view-toggle";

const ROW_REORDER = LinearTransition.duration(420).easing(Easing.out(Easing.cubic));
const ROW_EXIT = FadeOut.duration(200);
const FALLBACK_COLOR = "#767676";

interface BalancesCategoriesProps {
    addMenu: ReactNode;
    /** Rows in their undo window included; this view hides them itself. */
    allBudgets: readonly CategoryBudgetView[];
    contributions: readonly ExpenseContribution[];
    currency: string;
    mainRow: MainBudgetView | null;
    nowMs: number;
    onLimit: (target: LimitTarget) => void;
    onPickCategory: () => void;
    toggle: BalancesViewToggleProps;
}

/** The Categories view of Balances: what each category took this month, against its limit when it has one. */
export function BalancesCategories({
    addMenu,
    allBudgets,
    contributions,
    currency,
    mainRow,
    nowMs,
    onLimit,
    onPickCategory,
    toggle,
}: BalancesCategoriesProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const largeText = useAccessibilityTextSize();
    const asRows = useSettingBool("budgetViewStyle") || largeText;
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const categoryMeta = useCategoryMeta(db);
    const [gridWidth, setGridWidth] = useState<number | null>(null);
    const [monthOffset, setMonthOffset] = useState(0);
    const { pendingId, requestDelete } = useDeferredDelete("budget");
    const main = mainRow?.id === pendingId ? null : mainRow;
    const budgets = allBudgets.filter((budget) => budget.id !== pendingId);
    const mainBurndown = useBurndown(contributions, nowMs, main, null);
    const burndowns = useBurndowns(contributions, nowMs, budgets);

    if (contributions.length === 0 && mainRow === null && allBudgets.length === 0) {
        return (
            <>
                <Stack.Toolbar placement="right">{addMenu}</Stack.Toolbar>
                <ScrollView
                    className="bg-background"
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    <BalancesViewToggle {...toggle} />
                    <BudgetEmptyState onAddTransaction={() => router.push("/transactions/create")} />
                </ScrollView>
            </>
        );
    }

    const thisMonth = startOfPeriod(new Date(nowMs), BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday });
    const month = shiftWindow(thisMonth, BUDGET_TYPE.month, monthOffset);
    const live = monthOffset === 0;
    const limitedIds = budgets.map((budget) => budget.categoryId).filter((id): id is string => id !== null);
    // A closed month lists every category: a limit's figures belong to its own window, not to that month.
    const spend = unlimitedSpend(contributions, month, new Set(live ? limitedIds : []));
    const heroTimeLeft = main ? budgetTimeLeftLabel(main.window, main.type, new Date(nowMs), t) : null;
    const ranked = [...budgets].sort(compareBudgetSeverity);
    const cardWidth = gridWidth === null ? null : gridWidth / 2;
    const money = (amount: number) => formatAmount(amount, currency, false, language);
    const top = main ? dominantCategory(contributions, main.window, Math.min(nowMs, main.window.end.getTime())) : null;
    const topName = top ? categoryMeta.get(top.categoryId)?.name : undefined;
    const sameCadence = budgets.every((budget) => budget.type === budgets[0]?.type);

    const openBudget = (id: string) => router.push(`/balances/${id}`);
    const openCategory = (categoryId: string) => {
        const limited = budgets.find((budget) => budget.categoryId === categoryId);
        if (limited) {
            openBudget(limited.id);
            return;
        }
        router.push(`/balances/category/${categoryId}`);
    };
    const menuItems = (budget: CategoryBudgetView) =>
        budgetMenuItems({
            onChangeLimit: () =>
                onLimit({
                    categoryId: budget.categoryId,
                    color: budget.color,
                    emoji: budget.emoji,
                    icon: budget.icon,
                    limit: budget.limit,
                    name: budget.name,
                    type: budget.type,
                    window: budget.window,
                }),
            onDelete: () => requestDelete(budget.id),
            t,
        });

    return (
        <>
            <Stack.Toolbar placement="right">{addMenu}</Stack.Toolbar>
            <ScrollView
                className="bg-background"
                contentContainerStyle={{
                    // Clears the floating add button.
                    paddingBottom: 100,
                    paddingHorizontal: 20,
                }}
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1 }}
            >
                <BalancesViewToggle {...toggle} />
                <View className="pt-3">
                    <BudgetPeriodStepper
                        label={firstDayOfMonth === 1 ? monthLongTitle(month.start, language) : undefined}
                        maxBack={periodsBackTo(thisMonth, BUDGET_TYPE.month, earliestDate(contributions))}
                        offset={monthOffset}
                        onStep={setMonthOffset}
                        type={BUDGET_TYPE.month}
                        window={month}
                    />
                </View>

                {live && main ? (
                    <BudgetBurndownHero
                        budget={main}
                        burndown={mainBurndown}
                        contributions={contributions}
                        currency={currency}
                        dominant={top && topName ? { name: topName, share: top.share } : null}
                        nowMs={nowMs}
                        onPress={() => router.push("/balances/overall")}
                    />
                ) : (
                    <View className="pt-3">
                        <MonoLabel>{t("balances.spent")}</MonoLabel>
                        <HeroNumber amount={spend.total} code={currency} showCents={showCents} />
                    </View>
                )}

                {live && budgets.length ? (
                    <View className="pt-6">
                        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 pb-2">
                            <MonoLabel>{t("balances.withLimit")}</MonoLabel>
                            {sameCadence ? (
                                <MonoLabel>
                                    {t("budgets.spentOfLimit", {
                                        limit: money(budgets.reduce((sum, budget) => sum + budget.amount, 0)),
                                        spent: money(budgets.reduce((sum, budget) => sum + budget.spent, 0)),
                                    })}
                                </MonoLabel>
                            ) : null}
                        </View>
                        {asRows ? (
                            <View className="divide-border divide-y">
                                {ranked.map((budget) => (
                                    <Animated.View exiting={ROW_EXIT} key={budget.id} layout={ROW_REORDER}>
                                        <BudgetRow
                                            budget={budget}
                                            burndown={burndowns.get(budget.id) ?? null}
                                            contributions={contributions}
                                            currency={currency}
                                            heroTimeLeft={heroTimeLeft}
                                            menuItems={menuItems(budget)}
                                            nowMs={nowMs}
                                            onDelete={requestDelete}
                                            onPress={openBudget}
                                        />
                                    </Animated.View>
                                ))}
                            </View>
                        ) : (
                            // Measured, not flexed: a context menu's self-sizing host collapses a `flex-1` card.
                            <View onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
                                {pairs([...ranked, null]).map((pair) => (
                                    <View className="border-border flex-row border-t" key={pair[0]?.id ?? "new"}>
                                        {pair.map((budget, index) => {
                                            if (budget === undefined) {
                                                return <View className="flex-1" key="empty" />;
                                            }
                                            if (budget === null) {
                                                return (
                                                    <NewBudgetCell
                                                        key="new"
                                                        onPress={onPickCategory}
                                                        right={index === 1}
                                                        width={cardWidth}
                                                    />
                                                );
                                            }
                                            return (
                                                <BudgetCard
                                                    budget={budget}
                                                    currency={currency}
                                                    heroTimeLeft={heroTimeLeft}
                                                    key={budget.id}
                                                    menuItems={menuItems(budget)}
                                                    nowMs={nowMs}
                                                    onPress={openBudget}
                                                    right={index === 1}
                                                    width={cardWidth}
                                                />
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ) : null}

                {spend.rows.length ? (
                    <View className="pt-7">
                        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 pb-2">
                            <MonoLabel>{live ? t("balances.noLimit") : t("budgets.list.categories")}</MonoLabel>
                            <MonoLabel>{money(spend.rows.reduce((sum, row) => sum + row.spent, 0))}</MonoLabel>
                        </View>
                        <View className="border-border divide-border divide-y border-t">
                            {spend.rows.map((row) => {
                                const meta = categoryMeta.get(row.categoryId);
                                return (
                                    <SpendRow
                                        color={meta?.color ?? FALLBACK_COLOR}
                                        currency={currency}
                                        emoji={meta?.emoji ?? null}
                                        icon={meta?.icon ?? null}
                                        key={row.categoryId}
                                        name={meta?.name ?? t("budgets.name.default")}
                                        onPress={openCategory}
                                        row={row}
                                    />
                                );
                            })}
                        </View>
                    </View>
                ) : null}
            </ScrollView>
        </>
    );
}

interface SpendRowProps {
    color: string;
    currency: string;
    emoji: string | null;
    icon: string | null;
    name: string;
    onPress: (categoryId: string) => void;
    row: UnlimitedCategory;
}

function SpendRow({ color, currency, emoji, icon, name, onPress, row }: SpendRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const percent = Math.round(row.share * 100);
    const share = t("balances.share", { percent: percent === 0 ? "<1" : String(percent) });
    const amount = formatAmount(row.spent, currency, showCents, language);

    return (
        <Pressable
            accessibilityLabel={name}
            accessibilityRole="button"
            accessibilityValue={{ text: `${amount}, ${share}` }}
            className="flex-row items-center gap-3 py-3 active:opacity-60"
            onPress={() => onPress(row.categoryId)}
        >
            <CategoryIconTile color={color} emoji={emoji} icon={icon} size={30} />
            <View className="flex-1 gap-0.5">
                <Text className="font-sans-semibold text-body text-foreground" numberOfLines={1}>
                    {name}
                </Text>
                <Text className="text-muted text-subtitle tabular-nums">{share}</Text>
            </View>
            <Text className="font-sans-semibold text-body text-foreground tabular-nums" numberOfLines={1}>
                {amount}
            </Text>
        </Pressable>
    );
}

import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { Easing, FadeOut, LinearTransition } from "react-native-reanimated";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import type { CategoryPickerSheetRef } from "@/components/category-picker-sheet";
import { MonoLabel } from "@/components/mono-label";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { settledBalanceAt, useAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import type { CategoryBudgetView } from "@/data/budgets";
import {
    budgetsRepo,
    compareBudgetSeverity,
    useBurndown,
    useBurndowns,
    useExpenseContributions,
    useMainBudget,
    usePerCategoryBudgets,
    useUnbudgetedScopes,
} from "@/data/budgets";
import { useCategoryMeta } from "@/data/categories";
import type { Category } from "@/data/categories-core";
import { useSavingsGoals } from "@/data/savings-goals";
import { GoalValuationError, savingsGoalsRepo } from "@/data/savings-goals-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import type { Database } from "@/db/client";
import { dominantCategory } from "@/domain/budget-dominant";
import { budgetTimeLeftLabel } from "@/domain/budget-math";
import { blocksNewBudget, FREE_BUDGETS } from "@/domain/pro-limits";
import { useAccountCreateRoute, useProCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { budgetMenuItems } from "@/lib/budget-actions";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

import { BudgetBurndownHero } from "./components/budget-burndown-hero";
import { BudgetCard } from "./components/budget-card";
import { BudgetEmptyState } from "./components/budget-empty-state";
import type { LimitCommit, LimitTarget } from "./components/budget-limit-body";
import { BudgetLimitSheet } from "./components/budget-limit-sheet";
import { BudgetRow } from "./components/budget-row";
import { GoalTargetSheet } from "./components/goal-target-sheet";
import type { GoalCommit, GoalTarget } from "./components/goal-target-sheet";
import { SavingsGoalsSection } from "./components/savings-goals-section";
import { UnbudgetedRail } from "./components/unbudgeted-rail";
import { pairs } from "./pairs";

const CARD_GUTTER = 12;
const ROW_REORDER = LinearTransition.duration(420).easing(Easing.out(Easing.cubic));
const ROW_EXIT = FadeOut.duration(200);
const NO_BUDGETS: readonly CategoryBudgetView[] = [];

export function Budgets() {
    const db = useDatabase();
    const router = useRouter();
    const accountCreateRoute = useAccountCreateRoute();
    const [gridWidth, setGridWidth] = useState<number | null>(null);
    const t = useTranslation();
    const haptics = useHaptics();
    const currency = useGlobalCurrency(db);
    const asRows = useSettingBool("budgetViewStyle");
    const nowMs = useNow();
    const allGoals = useSavingsGoals(db, nowMs);
    const accounts = useAccounts(db);
    const valuation = useValuation(db);

    // One subscription for the screen: every hook below derives from it.
    const contributions = useExpenseContributions(db, nowMs);
    const { pendingId, requestDelete } = useDeferredDelete("budget");
    const { pendingId: pendingGoalId } = useDeferredDelete("goal");
    const mainRow = useMainBudget(db, nowMs, contributions);
    // `mainRow` gates creation: a new singleton set while the old is pending rewrites the row being tombstoned.
    const main = mainRow?.id === pendingId ? null : mainRow;
    const allBudgets = usePerCategoryBudgets(db, nowMs, contributions);
    const budgets = useMemo(() => allBudgets.filter((budget) => budget.id !== pendingId), [allBudgets, pendingId]);
    const mainBurndown = useBurndown(contributions, nowMs, main, null);
    const dominant = useDominant(db, contributions, main, nowMs);
    const burndowns = useBurndowns(contributions, nowMs, asRows ? NO_BUDGETS : budgets);
    const heroTimeLeft = main ? budgetTimeLeftLabel(main.window, main.type, new Date(nowMs), t) : null;

    const goals = useMemo(() => allGoals.filter((entry) => entry.goal.id !== pendingGoalId), [allGoals, pendingGoalId]);
    const ranked = useMemo(() => [...budgets].sort(compareBudgetSeverity), [budgets]);
    // `allBudgets`: a budget in its undo window still owns its unique category id.
    const budgetedCategoryIds = useMemo(
        () => allBudgets.map((budget) => budget.categoryId).filter((id): id is string => id !== null),
        [allBudgets]
    );
    const overCount = budgets.filter((budget) => budget.overBudget).length;

    // Undo-window rows and goals count, so the takeover never hides them.
    const isEmpty = mainRow === null && allBudgets.length === 0 && allGoals.length === 0;

    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const calendar = useMemo(() => ({ firstDayOfMonth, firstWeekday }), [firstDayOfMonth, firstWeekday]);
    const rail = useUnbudgetedScopes(db, nowMs, contributions);

    const limitSheetRef = useRef<BottomSheetModal>(null);
    const [limitTarget, setLimitTarget] = useState<LimitTarget | null>(null);
    const budgetsCapped = useProCapped(allBudgets.length, FREE_BUDGETS);
    const accountSheetRef = useRef<BottomSheetModal>(null);
    const goalSheetRef = useRef<BottomSheetModal>(null);
    const [goalTarget, setGoalTarget] = useState<GoalTarget | null>(null);

    // Presented from an effect: `menuItems` runs in render, where a ref read trips the compiler.
    const openLimit = (target: LimitTarget) => {
        if (blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
            router.push("/paywall");
            return;
        }
        setLimitTarget(target);
    };
    useEffect(() => {
        if (limitTarget) {
            limitSheetRef.current?.present();
        }
    }, [limitTarget]);

    useEffect(() => {
        if (goalTarget) {
            goalSheetRef.current?.present();
        }
    }, [goalTarget]);

    const commitGoal = async ({ targetAmount, targetDate }: GoalCommit) => {
        const target = goalTarget;
        if (!target) {
            return;
        }
        // A synced currency change mid-sheet would file the target under the wrong currency for good.
        if (target.currency !== currency) {
            goalSheetRef.current?.dismiss();
            notifyFailure({ body: t("goals.currencyMoved.body"), title: t("goals.currencyMoved.title") });
            return;
        }
        // Re-read now: a scheduled row can land while the sheet is open, and the anchor is frozen forever.
        const account = accounts.find((candidate) => candidate.id === target.accountId);
        const balance = account && (await settledBalanceAt(db, account, valuation, new Date()));
        if (!balance?.exact) {
            notifyFailure({
                body: t("goals.unvalued.body", { account: target.name }),
                title: t("goals.unvalued.title"),
            });
            return;
        }
        goalSheetRef.current?.dismiss();
        try {
            await savingsGoalsRepo.create(db, {
                accountId: target.accountId,
                currency: target.currency,
                name: target.name,
                startAmount: balance.value,
                targetAmount,
                targetDate,
            });
            haptics("success");
        } catch (error) {
            console.error("Failed to save the goal", error);
            notifyFailure(
                error instanceof GoalValuationError
                    ? { body: t("goals.unvalued.body", { account: target.name }), title: t("goals.unvalued.title") }
                    : { body: t("goals.failedBody"), title: t("goals.failedTitle") }
            );
        }
    };

    const categoryPickerRef = useRef<CategoryPickerSheetRef>(null);
    const presentCategoryPicker = () => categoryPickerRef.current?.present();
    const selectCategory = (picked: Category) => {
        openLimit({
            categoryId: picked.id,
            color: picked.color,
            emoji: picked.emoji,
            icon: picked.icon,
            limit: null,
            name: picked.name ?? t("budgets.name.default"),
            type: BUDGET_TYPE.month,
        });
        categoryPickerRef.current?.dismiss();
    };

    const commitEverything = async ({ limit, type }: LimitCommit) => {
        try {
            await budgetsRepo.createMainBudget(db, { amount: limit, type });
            haptics("success");
        } catch (error) {
            console.error("Failed to create the overall budget", error);
            notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
        }
    };

    const commitLimit = async ({ limit, limitChanged, type }: LimitCommit) => {
        const target = limitTarget;
        if (!target) {
            return;
        }
        limitSheetRef.current?.dismiss();
        const save = async () => {
            if (target.categoryId === null) {
                await budgetsRepo.createMainBudget(db, { amount: limit, type });
                haptics("success");
                return;
            }
            const existing = allBudgets.find((budget) => budget.categoryId === target.categoryId);
            // Re-checked at write: entitlement or sync can change while the sheet is open.
            if (!existing && blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
                router.push("/paywall");
                return;
            }
            await (existing
                ? budgetsRepo.patchBudget(db, existing.id, { ...(limitChanged && { amount: limit }), type })
                : budgetsRepo.createBudget(db, { amount: limit, categoryId: target.categoryId, type }));
            haptics("success");
        };
        await save().catch((error) => {
            console.error("Failed to save the budget", error);
            notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
        });
    };

    const cardWidth = gridWidth === null ? null : (gridWidth - CARD_GUTTER) / 2;

    const menuItems = (budget: CategoryBudgetView) =>
        budgetMenuItems({
            onChangeLimit: () =>
                openLimit({
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

    /** Mounted by both branches: the takeover also offers a goal. */
    const goalSheets = (
        <>
            <AccountPickerSheet
                allowNone={false}
                db={db}
                onCreate={() => {
                    accountSheetRef.current?.dismiss();
                    router.push(accountCreateRoute);
                }}
                onSelect={async (picked) => {
                    accountSheetRef.current?.dismiss();
                    if (!picked) {
                        return;
                    }
                    const balance = await settledBalanceAt(db, picked, valuation, new Date());
                    // The anchor is frozen, so an approximate balance would leave a permanent gap.
                    if (!balance.exact) {
                        notifyFailure({
                            body: t("goals.unvalued.body", { account: picked.name }),
                            title: t("goals.unvalued.title"),
                        });
                        return;
                    }
                    setGoalTarget({
                        accountId: picked.id,
                        balance: balance.value,
                        currency,
                        name: picked.name,
                    });
                }}
                ref={accountSheetRef}
                selectedId={null}
            />
            <GoalTargetSheet onCommit={commitGoal} ref={goalSheetRef} target={goalTarget} />
        </>
    );

    if (isEmpty) {
        return (
            <>
                <View className="bg-background flex-1 justify-center">
                    <BudgetEmptyState
                        calendar={calendar}
                        contributions={contributions}
                        currency={currency}
                        nowMs={nowMs}
                        onAddGoal={() => accountSheetRef.current?.present()}
                        onAddTransaction={() => router.push("/transactions/create")}
                        onCommit={commitEverything}
                    />
                </View>
                {/* The takeover's goal action opens these. */}
                {goalSheets}
            </>
        );
    }

    return (
        <>
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
                {main ? (
                    <BudgetBurndownHero
                        budget={main}
                        burndown={mainBurndown}
                        contributions={contributions}
                        currency={currency}
                        dominant={dominant}
                        nowMs={nowMs}
                        onPress={() => router.push("/budgets/overall")}
                    />
                ) : null}

                {budgets.length ? (
                    <View className="pt-6">
                        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 pb-2">
                            <MonoLabel>{main ? t("budgets.list.categories") : t("budgets.list.budgets")}</MonoLabel>
                            {overCount ? (
                                <MonoLabel>
                                    {t("budgets.list.overCount", {
                                        over: overCount,
                                        total: budgets.length,
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
                                            contributions={contributions}
                                            currency={currency}
                                            heroTimeLeft={heroTimeLeft}
                                            menuItems={menuItems(budget)}
                                            nowMs={nowMs}
                                            onDelete={requestDelete}
                                            onPress={(id) => router.push(`/budgets/${id}`)}
                                        />
                                    </Animated.View>
                                ))}
                            </View>
                        ) : (
                            // Measured, not flexed: a context menu's self-sizing host collapses a `flex-1` card.
                            <View className="gap-3" onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
                                {pairs(ranked).map(([left, right]) => (
                                    <View className="flex-row gap-3" key={left.id}>
                                        <BudgetCard
                                            budget={left}
                                            burndown={burndowns.get(left.id) ?? null}
                                            contributions={contributions}
                                            currency={currency}
                                            heroTimeLeft={heroTimeLeft}
                                            menuItems={menuItems(left)}
                                            nowMs={nowMs}
                                            onPress={(id) => router.push(`/budgets/${id}`)}
                                            width={cardWidth}
                                        />
                                        {right ? (
                                            <BudgetCard
                                                budget={right}
                                                burndown={burndowns.get(right.id) ?? null}
                                                contributions={contributions}
                                                currency={currency}
                                                heroTimeLeft={heroTimeLeft}
                                                menuItems={menuItems(right)}
                                                nowMs={nowMs}
                                                onPress={(id) => router.push(`/budgets/${id}`)}
                                                width={cardWidth}
                                            />
                                        ) : (
                                            <View className="flex-1" />
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ) : null}

                <UnbudgetedRail
                    currency={currency}
                    everythingTypical={rail.everything}
                    onPress={(scope) =>
                        openLimit(
                            scope
                                ? {
                                      categoryId: scope.categoryId,
                                      color: scope.color,
                                      emoji: scope.emoji,
                                      icon: scope.icon,
                                      limit: null,
                                      name: scope.name,
                                      type: BUDGET_TYPE.month,
                                      window: rail.window,
                                  }
                                : {
                                      categoryId: null,
                                      limit: null,
                                      name: t("budgets.scope.everything").toLocaleLowerCase(),
                                      type: BUDGET_TYPE.month,
                                      window: rail.window,
                                  }
                        )
                    }
                    offerEverything={mainRow === null}
                    periodPhrase={t("budgets.periodPhrase.month")}
                    scopes={rail.scopes}
                />

                <SavingsGoalsSection
                    currency={currency}
                    goals={goals}
                    onAdd={() => accountSheetRef.current?.present()}
                    onPress={(id) => router.push(`/budgets/goals/${id}`)}
                />
            </ScrollView>

            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button accessibilityLabel={t("budgets.rail.another")} onPress={presentCategoryPicker}>
                    <Stack.Toolbar.Icon {...toolbarIcon("add")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>

            <BudgetLimitSheet
                calendar={calendar}
                contributions={contributions}
                currency={currency}
                nowMs={nowMs}
                onCommit={commitLimit}
                ref={limitSheetRef}
                target={limitTarget}
            />
            <CategoryPickerSheet
                db={db}
                excludeIds={budgetedCategoryIds}
                income={false}
                onSelect={selectCategory}
                ref={categoryPickerRef}
                selectedId={null}
            />
            {goalSheets}
        </>
    );
}

function useDominant(
    db: Database,
    contributions: readonly ExpenseContribution[],
    main: ReturnType<typeof useMainBudget>,
    nowMs: number
): { name: string; share: number } | null {
    const categoryMeta = useCategoryMeta(db);
    return useMemo(() => {
        if (!main) {
            return null;
        }
        const top = dominantCategory(contributions, main.window, Math.min(nowMs, main.window.end.getTime()));
        const name = top ? categoryMeta.get(top.categoryId)?.name : undefined;
        return top && name ? { name, share: top.share } : null;
    }, [contributions, main, nowMs, categoryMeta]);
}

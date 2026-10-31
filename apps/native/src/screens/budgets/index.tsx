import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import * as Cause from "effect/Cause";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { Easing, FadeOut, LinearTransition } from "react-native-reanimated";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import type { CategoryPickerSheetRef } from "@/components/category-picker-sheet";
import { MonoLabel } from "@/components/mono-label";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import type { CategoryBudgetView } from "@/data/budgets";
import {
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
import { GoalValuationError } from "@/data/savings-goals-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import type { Database } from "@/db/client";
import { dominantCategory } from "@/domain/budget-dominant";
import { budgetTimeLeftLabel } from "@/domain/budget-math";
import { blocksNewBudget, FREE_BUDGETS } from "@/domain/pro-limits";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useCreateAccount, useOpenPaywall, useProCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { budgetMenuItems } from "@/lib/budget-actions";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import {
    createGoalFromAccountCommand,
    GoalAnchorUnvaluedError,
    readGoalAnchorCommand,
} from "@/state/budget-flow-commands";
import { createBudgetCommand, createMainBudgetCommand, patchBudgetCommand } from "@/state/planning-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { BudgetBurndownHero } from "./components/budget-burndown-hero";
import { BudgetCard, NewBudgetCell } from "./components/budget-card";
import { BudgetEmptyState } from "./components/budget-empty-state";
import type { LimitCommit, LimitTarget } from "./components/budget-limit-body";
import { BudgetLimitSheet } from "./components/budget-limit-sheet";
import { useBudgetPeriodMenu } from "./components/budget-period-menu";
import type { BudgetsView } from "./components/budget-period-menu";
import { BudgetRow } from "./components/budget-row";
import { GoalTargetSheet } from "./components/goal-target-sheet";
import type { GoalCommit, GoalTarget } from "./components/goal-target-sheet";
import { SavingsGoalsSection } from "./components/savings-goals-section";
import { UnbudgetedRail } from "./components/unbudgeted-rail";
import { useCommitLatch } from "./components/use-commit-latch";
import { pairs } from "./pairs";
import { YearView } from "./plan/year-view";

const ROW_REORDER = LinearTransition.duration(420).easing(Easing.out(Easing.cubic));
const ROW_EXIT = FadeOut.duration(200);

export function Budgets() {
    const db = useDatabase();
    const router = useRouter();
    const createAccount = useCreateAccount();
    const openPaywall = useOpenPaywall();
    const [gridWidth, setGridWidth] = useState<number | null>(null);
    const [view, setView] = useState<BudgetsView>("month");
    const periodMenu = useBudgetPeriodMenu({ onSelect: setView, view });
    const t = useTranslation();
    const haptics = useHaptics();
    const currency = useGlobalCurrency(db);
    const largeText = useAccessibilityTextSize();
    const asRows = useSettingBool("budgetViewStyle") || largeText;
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
    const budgets = allBudgets.filter((budget) => budget.id !== pendingId);
    const mainBurndown = useBurndown(contributions, nowMs, main, null);
    const dominant = useDominant(db, contributions, main, nowMs);
    const burndowns = useBurndowns(contributions, nowMs, budgets);
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const calendar = { firstDayOfMonth, firstWeekday };
    const rail = useUnbudgetedScopes(db, nowMs, contributions);

    const limitSheetRef = useRef<BottomSheetModal>(null);
    const [limitTarget, setLimitTarget] = useState<LimitTarget | null>(null);
    const budgetsCapped = useProCapped(allBudgets.length, FREE_BUDGETS);
    const accountSheetRef = useRef<BottomSheetModal>(null);
    const goalSheetRef = useRef<BottomSheetModal>(null);
    const categoryPickerRef = useRef<CategoryPickerSheetRef>(null);
    const [goalTarget, setGoalTarget] = useState<GoalTarget | null>(null);

    const goalLatch = useCommitLatch();
    const limitLatch = useCommitLatch();
    const everythingLatch = useCommitLatch();
    const createGoal = useAtomAction(
        createGoalFromAccountCommand,
        {
            onFailure: (cause) => {
                const error = Cause.squash(cause);
                const unvalued = {
                    body: t("goals.unvalued.body", { account: goalTarget?.name ?? "" }),
                    title: t("goals.unvalued.title"),
                };
                if (error instanceof GoalAnchorUnvaluedError) {
                    notifyFailure(unvalued);
                    return;
                }
                console.error("Failed to save the goal", error);
                notifyFailure(
                    error instanceof GoalValuationError
                        ? unvalued
                        : { body: t("goals.failedBody"), title: t("goals.failedTitle") }
                );
            },
            onSettled: goalLatch.release,
            onSuccess: () => haptics("success"),
        },
        SILENT
    );
    const readGoalAnchor = useAtomAction(readGoalAnchorCommand, {
        onSuccess: ({ account, balance }) => {
            // The anchor is frozen, so an approximate balance would leave a permanent gap.
            if (!balance.exact) {
                notifyFailure({
                    body: t("goals.unvalued.body", { account: account.name }),
                    title: t("goals.unvalued.title"),
                });
                return;
            }
            setGoalTarget({ accountId: account.id, balance: balance.value, currency, name: account.name });
            goalSheetRef.current?.present();
        },
    });
    const limitSaved = {
        onFailure: (cause: Cause.Cause<unknown>) => {
            console.error("Failed to save the budget", Cause.squash(cause));
            notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
        },
        onSettled: limitLatch.release,
        onSuccess: () => haptics("success"),
    };
    const createLimitMain = useAtomAction(createMainBudgetCommand, limitSaved, SILENT);
    const patchLimit = useAtomAction(patchBudgetCommand, limitSaved, SILENT);
    const createLimit = useAtomAction(createBudgetCommand, limitSaved, SILENT);
    const createEverything = useAtomAction(
        createMainBudgetCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to create the overall budget", Cause.squash(cause));
                notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
            },
            onSettled: everythingLatch.release,
            onSuccess: () => haptics("success"),
        },
        SILENT
    );

    // oxlint-disable-next-line outlayr/react-effect-budget -- presents the native limit sheet once its target has rendered, after the category picker has dismissed
    useEffect(() => {
        if (limitTarget) {
            limitSheetRef.current?.present();
        }
    }, [limitTarget]);

    const heroTimeLeft = main ? budgetTimeLeftLabel(main.window, main.type, new Date(nowMs), t) : null;

    const goals = allGoals.filter((entry) => entry.goal.id !== pendingGoalId);
    const ranked = [...budgets].sort(compareBudgetSeverity);
    // `allBudgets`: a budget in its undo window still owns its unique category id.
    const budgetedCategoryIds = allBudgets.map((budget) => budget.categoryId).filter((id): id is string => id !== null);
    const overCount = budgets.filter((budget) => budget.overBudget).length;

    // Undo-window rows and goals count, so the takeover never hides them.
    const isEmpty = mainRow === null && allBudgets.length === 0 && allGoals.length === 0;

    const openLimit = (target: LimitTarget) => {
        if (blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
            openPaywall("budgets");
            return;
        }
        setLimitTarget(target);
    };

    const commitGoal = ({ targetAmount, targetDate }: GoalCommit) => {
        const target = goalTarget;
        if (!target || !goalLatch.hold()) {
            return;
        }
        // A synced currency change mid-sheet would file the target under the wrong currency for good.
        if (target.currency !== currency) {
            goalSheetRef.current?.dismiss();
            notifyFailure({ body: t("goals.currencyMoved.body"), title: t("goals.currencyMoved.title") });
            goalLatch.release();
            return;
        }
        createGoal({
            account: accounts.find((candidate) => candidate.id === target.accountId),
            db,
            dismiss: () => goalSheetRef.current?.dismiss(),
            goal: {
                accountId: target.accountId,
                currency: target.currency,
                name: target.name,
                targetAmount,
                targetDate,
            },
            valuation,
        });
    };

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

    const commitEverything = ({ limit, type }: LimitCommit) => {
        if (everythingLatch.hold()) {
            createEverything({ db, input: { amount: limit, type } });
        }
    };

    const commitLimit = ({ limit, limitChanged, type }: LimitCommit) => {
        const target = limitTarget;
        if (!target || !limitLatch.hold()) {
            return;
        }
        limitSheetRef.current?.dismiss();
        if (target.categoryId === null) {
            createLimitMain({ db, input: { amount: limit, type } });
            return;
        }
        const existing = allBudgets.find((budget) => budget.categoryId === target.categoryId);
        // Re-checked at write: entitlement or sync can change while the sheet is open.
        if (!existing && blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
            openPaywall("budgets");
            limitLatch.release();
            return;
        }
        if (existing) {
            patchLimit({ db, id: existing.id, patch: { ...(limitChanged && { amount: limit }), type } });
        } else {
            createLimit({ db, input: { amount: limit, categoryId: target.categoryId, type } });
        }
    };

    const cardWidth = gridWidth === null ? null : gridWidth / 2;

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
                    createAccount();
                }}
                onSelect={(picked) => {
                    accountSheetRef.current?.dismiss();
                    if (picked) {
                        readGoalAnchor({ account: picked, db, valuation });
                    }
                }}
                ref={accountSheetRef}
                selectedId={null}
            />
            <GoalTargetSheet onCommit={commitGoal} ref={goalSheetRef} target={goalTarget} />
        </>
    );

    if (isEmpty && view === "month") {
        return (
            <>
                <Stack.Toolbar placement="right">{periodMenu}</Stack.Toolbar>
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
                {view === "year" ? <YearView db={db} nowMs={nowMs} /> : null}
                {view === "month" && main ? (
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

                {view === "month" && budgets.length ? (
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
                                            burndown={burndowns.get(budget.id) ?? null}
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
                                                        onPress={presentCategoryPicker}
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
                                                    onPress={(id) => router.push(`/budgets/${id}`)}
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

                {view === "month" ? (
                    <>
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
                    </>
                ) : null}
            </ScrollView>

            <Stack.Toolbar placement="right">
                {periodMenu}
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
    if (!main) {
        return null;
    }
    const top = dominantCategory(contributions, main.window, Math.min(nowMs, main.window.end.getTime()));
    const name = top ? categoryMeta.get(top.categoryId)?.name : undefined;
    return top && name ? { name, share: top.share } : null;
}

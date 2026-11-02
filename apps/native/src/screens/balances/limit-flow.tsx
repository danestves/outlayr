import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import * as Cause from "effect/Cause";
import { useEffect, useRef, useState } from "react";

import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import type { CategoryPickerSheetRef } from "@/components/category-picker-sheet";
import { useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import type { CategoryBudgetView } from "@/data/budgets";
import type { Category } from "@/data/categories-core";
import { blocksNewBudget, FREE_BUDGETS } from "@/domain/pro-limits";
import { useOpenPaywall, useProCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import type { LimitCommit, LimitTarget } from "@/screens/budgets/components/budget-limit-body";
import { BudgetLimitSheet } from "@/screens/budgets/components/budget-limit-sheet";
import { useCommitLatch } from "@/screens/budgets/components/use-commit-latch";
import { SILENT } from "@/state/atom-command";
import { createBudgetCommand, createMainBudgetCommand, patchBudgetCommand } from "@/state/planning-commands";
import { useAtomAction } from "@/state/use-atom-action";

interface LimitFlowOptions {
    /** Rows in their undo window included: a pending budget still owns its unique category id. */
    allBudgets: readonly CategoryBudgetView[];
    contributions: readonly ExpenseContribution[];
    currency: string;
    nowMs: number;
}

/** Setting or changing a limit: `pickCategory` opens the picker, `openLimit` the sheet; mount `sheets` once. */
export function useLimitFlow({ allBudgets, contributions, currency, nowMs }: LimitFlowOptions) {
    const db = useDatabase();
    const t = useTranslation();
    const haptics = useHaptics();
    const openPaywall = useOpenPaywall();
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const limitSheetRef = useRef<BottomSheetModal>(null);
    const categoryPickerRef = useRef<CategoryPickerSheetRef>(null);
    const [limitTarget, setLimitTarget] = useState<LimitTarget | null>(null);
    const budgetsCapped = useProCapped(allBudgets.length, FREE_BUDGETS);
    const latch = useCommitLatch();
    const saved = {
        onFailure: (cause: Cause.Cause<unknown>) => {
            console.error("Failed to save the budget", Cause.squash(cause));
            notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
        },
        onSettled: latch.release,
        onSuccess: () => haptics("success"),
    };
    const createMain = useAtomAction(createMainBudgetCommand, saved, SILENT);
    const patchLimit = useAtomAction(patchBudgetCommand, saved, SILENT);
    const createLimit = useAtomAction(createBudgetCommand, saved, SILENT);

    // oxlint-disable-next-line outlayr/react-effect-budget -- presents the native limit sheet once its target has rendered, after the category picker has dismissed
    useEffect(() => {
        if (limitTarget) {
            limitSheetRef.current?.present();
        }
    }, [limitTarget]);

    const budgetedCategoryIds = allBudgets.map((budget) => budget.categoryId).filter((id): id is string => id !== null);

    const openLimit = (target: LimitTarget) => {
        if (blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
            openPaywall("budgets");
            return;
        }
        setLimitTarget(target);
    };

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

    const commitLimit = ({ limit, limitChanged, type }: LimitCommit) => {
        const target = limitTarget;
        if (!target || !latch.hold()) {
            return;
        }
        limitSheetRef.current?.dismiss();
        if (target.categoryId === null) {
            createMain({ db, input: { amount: limit, type } });
            return;
        }
        const existing = allBudgets.find((budget) => budget.categoryId === target.categoryId);
        // Re-checked at write: entitlement or sync can change while the sheet is open.
        if (!existing && blocksNewBudget(target.categoryId, budgetedCategoryIds, budgetsCapped)) {
            openPaywall("budgets");
            latch.release();
            return;
        }
        if (existing) {
            patchLimit({ db, id: existing.id, patch: { ...(limitChanged && { amount: limit }), type } });
        } else {
            createLimit({ db, input: { amount: limit, categoryId: target.categoryId, type } });
        }
    };

    return {
        openLimit,
        pickCategory: () => categoryPickerRef.current?.present(),
        sheets: (
            <>
                <BudgetLimitSheet
                    calendar={{ firstDayOfMonth, firstWeekday }}
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
            </>
        ),
    };
}

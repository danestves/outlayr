import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { useSettingNumber } from "@/contexts/display-settings-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { budgetsRepo, useCategoryBudget } from "@/data/budgets";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { budgetDetailPace, budgetPeriodPhrase, budgetWindowLabel } from "@/domain/budget-math";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { BudgetDetailToolbar } from "@/screens/budgets/components/budget-detail-toolbar";
import { BudgetDetailView } from "@/screens/budgets/components/budget-detail-view";
import { BudgetEditor } from "@/screens/budgets/components/budget-editor";
import type { BudgetEdit } from "@/screens/budgets/components/budget-editor";
import type { LimitCommit } from "@/screens/budgets/components/budget-limit-body";
import { BudgetLimitSheet } from "@/screens/budgets/components/budget-limit-sheet";
import { BudgetPeriodStepper } from "@/screens/budgets/components/budget-period-stepper";

export function BudgetDetail({ db, id, onDone }: { db: Database; id: string; onDone: () => void }) {
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const currency = useGlobalCurrency(db);
    const nowMs = useNow();
    const [periodOffset, setPeriodOffset] = useState(0);
    const { budget, transactions, periodsBack, contributions } = useCategoryBudget(db, id, nowMs, periodOffset);
    const { requestDelete } = useDeferredDelete("budget");
    const limitSheetRef = useRef<BottomSheetModal>(null);
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");
    const calendar = useMemo(() => ({ firstDayOfMonth, firstWeekday }), [firstDayOfMonth, firstWeekday]);

    useEffect(() => {
        if (budget === null) {
            onDone();
        }
    }, [budget, onDone]);

    if (!budget) {
        return <View className="bg-background flex-1" />;
    }

    const deleteBudget = () => {
        requestDelete(budget.id);
        onDone();
    };

    const write = async (edit: BudgetEdit) => {
        try {
            await budgetsRepo.patchBudget(db, budget.id, edit);
            return true;
        } catch (error) {
            console.error("Failed to change the budget", error);
            notifyFailure({ body: t("budgets.save.failedBody"), title: t("budgets.save.failedTitle") });
            return false;
        }
    };

    const commitLimit = async ({ limit, limitChanged, type }: LimitCommit) => {
        limitSheetRef.current?.dismiss();
        if (await write({ ...(limitChanged && { amount: limit }), type })) {
            haptics("success");
        }
    };

    const { closed, behind, perDay, paceRemaining } = budgetDetailPace(budget, new Date(nowMs), periodOffset);

    return (
        <>
            <BudgetDetailView
                amount={budget.amount}
                closed={closed}
                currency={currency}
                editor={
                    closed ? (
                        <Text className="text-muted text-subtitle pt-6 leading-snug">
                            {t("budgets.editor.closedWindow")}
                        </Text>
                    ) : (
                        <BudgetEditor
                            amount={budget.amount}
                            calendar={calendar}
                            carry={budget.carry}
                            currency={currency}
                            foreignCurrency={budget.currency === currency ? null : budget.currency}
                            limit={budget.limit}
                            name={budget.customName}
                            namePlaceholder={budget.name}
                            nowMs={nowMs}
                            onChange={write}
                            onChangeLimit={() => limitSheetRef.current?.present()}
                            rollover={budget.rollover}
                            startDate={budget.anchor}
                            type={budget.type}
                        />
                    )
                }
                leftover={budget.leftover}
                leftPerDayAmount={perDay}
                onPressTransaction={(txId) => router.push(`/transactions/${txId}`)}
                overBudget={budget.overBudget}
                paceBehind={behind}
                paceRemaining={paceRemaining}
                period={closed ? budgetWindowLabel(budget.window, budget.type) : t(budgetPeriodPhrase(budget.type))}
                spent={budget.spent}
                stepper={
                    periodsBack > 0 ? (
                        <BudgetPeriodStepper
                            maxBack={periodsBack}
                            offset={periodOffset}
                            onStep={setPeriodOffset}
                            type={budget.type}
                            window={budget.window}
                        />
                    ) : null
                }
                tint={budget.color}
                transactions={transactions}
            />

            <BudgetLimitSheet
                calendar={calendar}
                contributions={contributions}
                currency={currency}
                nowMs={nowMs}
                onCommit={commitLimit}
                ref={limitSheetRef}
                target={{
                    categoryId: budget.categoryId,
                    color: budget.color,
                    emoji: budget.emoji,
                    icon: budget.icon,
                    limit: budget.limit,
                    name: budget.name,
                    type: budget.type,
                    window: budget.window,
                }}
            />

            <ScreenHeader title={budget.name} />
            <BudgetDetailToolbar onDelete={deleteBudget} />
        </>
    );
}

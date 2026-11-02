import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { GoalValuationError } from "@/data/savings-goals-core";
import { useValuation } from "@/data/use-valuation";
import { useCreateAccount } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { GoalTargetSheet } from "@/screens/budgets/components/goal-target-sheet";
import type { GoalCommit, GoalTarget } from "@/screens/budgets/components/goal-target-sheet";
import { useCommitLatch } from "@/screens/budgets/components/use-commit-latch";
import { SILENT } from "@/state/atom-command";
import {
    createGoalFromAccountCommand,
    GoalAnchorUnvaluedError,
    readGoalAnchorCommand,
} from "@/state/budget-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

/** A new goal starts from the account that holds it: `start` opens that picker; mount `sheets` once. */
export function useGoalFlow() {
    const db = useDatabase();
    const t = useTranslation();
    const haptics = useHaptics();
    const createAccount = useCreateAccount();
    const currency = useGlobalCurrency(db);
    const accounts = useAccounts(db);
    const valuation = useValuation(db);
    const accountSheetRef = useRef<BottomSheetModal>(null);
    const goalSheetRef = useRef<BottomSheetModal>(null);
    const [goalTarget, setGoalTarget] = useState<GoalTarget | null>(null);
    const latch = useCommitLatch();

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
            onSettled: latch.release,
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

    const commitGoal = ({ targetAmount, targetDate }: GoalCommit) => {
        const target = goalTarget;
        if (!target || !latch.hold()) {
            return;
        }
        // A synced currency change mid-sheet would file the target under the wrong currency for good.
        if (target.currency !== currency) {
            goalSheetRef.current?.dismiss();
            notifyFailure({ body: t("goals.currencyMoved.body"), title: t("goals.currencyMoved.title") });
            latch.release();
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

    return {
        sheets: (
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
        ),
        start: () => accountSheetRef.current?.present(),
    };
}

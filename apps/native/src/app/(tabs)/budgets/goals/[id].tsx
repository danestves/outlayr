import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";

import { ScreenHeader } from "@/components/screen-header";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useSavingsGoal } from "@/data/savings-goals";
import type { SavingsGoalPatch } from "@/data/savings-goals-core";
import { GoalValuationError } from "@/data/savings-goals-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { GoalDetailView } from "@/screens/budgets/components/goal-detail-view";
import { GoalEditor } from "@/screens/budgets/components/goal-editor";
import type { GoalEdit } from "@/screens/budgets/components/goal-editor";
import { GoalTargetSheet } from "@/screens/budgets/components/goal-target-sheet";
import type { GoalCommit, GoalTarget } from "@/screens/budgets/components/goal-target-sheet";
import { useCommitLatch } from "@/screens/budgets/components/use-commit-latch";
import { SILENT } from "@/state/atom-command";
import { updateSavingsGoalCommand } from "@/state/planning-commands";
import { useAtomAction } from "@/state/use-atom-action";

export default function GoalScreen() {
    const router = useRouter();
    const t = useTranslation();
    const db = useDatabase();
    const haptics = useHaptics();
    const nowMs = useNow();
    const currency = useGlobalCurrency(db);
    const { id } = useLocalSearchParams<{ id: string }>();
    const entry = useSavingsGoal(db, id, nowMs);
    const latch = useCommitLatch();
    const saved = {
        onFailure: (cause: Cause.Cause<unknown>) => {
            const error = Cause.squash(cause);
            console.error("Failed to save the goal", error);
            // An uncanonicalisable target is refused: stored against a null it would read back as the face value in
            // whatever currency the ledger is shown in next.
            notifyFailure(
                error instanceof GoalValuationError
                    ? {
                          body: t("goals.unvalued.body", { account: entry?.accountName ?? "" }),
                          title: t("goals.unvalued.title"),
                      }
                    : { body: t("goals.failedBody"), title: t("goals.failedTitle") }
            );
        },
        onSuccess: () => haptics("success"),
    };
    const updateGoal = useAtomAction(updateSavingsGoalCommand, saved, SILENT);
    const commitGoalTarget = useAtomAction(updateSavingsGoalCommand, { ...saved, onSettled: latch.release }, SILENT);
    const { requestDelete } = useDeferredDelete("goal");

    const targetSheetRef = useRef<BottomSheetModal>(null);
    const [retarget, setRetarget] = useState<GoalTarget | null>(null);

    if (entry == null) {
        return null;
    }

    const { goal } = entry;

    const write = (patch: SavingsGoalPatch) => updateGoal({ db, id: goal.id, patch });

    // Only touched facts commit: a peer can move the deadline while the sheet is up, and writing the snapshot back
    // would revert it. The sheet opens in the goal's own currency, so a typed target is stored as-is.
    const commitTarget = ({ dateChanged, targetAmount, targetChanged, targetDate }: GoalCommit) => {
        if (!latch.hold()) {
            return;
        }
        targetSheetRef.current?.dismiss();
        commitGoalTarget({
            db,
            id: goal.id,
            patch: { ...(dateChanged && { targetDate }), ...(targetChanged && { targetAmount }) },
        });
    };

    return (
        <>
            <GoalDetailView
                currency={currency}
                editor={
                    <GoalEditor
                        accountName={entry.accountName}
                        currency={currency}
                        foreignCurrency={goal.currency === currency ? null : goal.currency}
                        name={goal.name}
                        onChange={(edit: GoalEdit) => write(edit)}
                        onChangeTarget={() => {
                            setRetarget({
                                accountId: goal.accountId,
                                // `saved` is valued into the display currency: the goal's figure only while they agree.
                                balance: goal.currency === currency ? entry.saved : null,
                                currency: goal.currency,
                                existing: { targetAmount: goal.targetAmount, targetDate: goal.targetDate },
                                name: entry.accountName,
                            });
                            targetSheetRef.current?.present();
                        }}
                        onDelete={() => {
                            requestDelete(goal.id);
                            router.back();
                        }}
                        perMonth={entry.progress.pace?.perMonth ?? null}
                        targetAmount={entry.target}
                        // The target's own exactness, not the entry's: that also fails on an unvalued balance, which
                        // would stamp a display-currency figure with the goal's currency.
                        targetCurrency={entry.targetExact ? currency : goal.currency}
                        targetDate={goal.targetDate}
                    />
                }
                entry={entry}
                nowMs={nowMs}
            />
            <ScreenHeader title={goal.name} />
            <GoalTargetSheet onCommit={commitTarget} ref={targetSheetRef} target={retarget} />
        </>
    );
}

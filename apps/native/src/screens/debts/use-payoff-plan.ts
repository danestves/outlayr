import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { AccountBalance } from "@outlayr/money/account-balance";
import { isPerson } from "@outlayr/money/account-kind";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import type { Account } from "@/data/accounts-core";
import { takesPayoffPlan } from "@/data/payoff-plans";
import type { PayoffLine } from "@/data/payoff-plans";
import type { Database } from "@/db/client";
import { usePayoffPlanGate } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import type { GoalCommit, GoalTarget } from "@/screens/budgets/components/goal-target-sheet";
import { useCommitLatch } from "@/screens/budgets/components/use-commit-latch";
import { SILENT } from "@/state/atom-command";
import { removeSavingsGoalCommand, setPayoffPlanCommand } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

function statedKey(account: Account, balance: number) {
    if (!isPerson(account)) {
        return "debts.plan.stated.liability";
    }
    return balance > 0 ? "debts.plan.stated.owesYou" : "debts.plan.stated.youOwe";
}

export function usePayoffPlan(db: Database, account: Account, balance: AccountBalance, line: PayoffLine | null) {
    const t = useTranslation();
    const haptics = useHaptics();
    const latch = useCommitLatch();
    const setPlan = useAtomAction(
        setPayoffPlanCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to save the payoff plan", Cause.squash(cause));
                notifyFailure({ title: t("debts.plan.failed") });
            },
            onSettled: latch.release,
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("success");
            },
        },
        SILENT
    );
    const removeGoal = useAtomAction(
        removeSavingsGoalCommand,
        {
            onFailure: () => notifyFailure({ title: t("debts.plan.failed") }),
            onSuccess: () => rearmInstallmentReminders(db),
        },
        SILENT
    );
    const gate = usePayoffPlanGate();
    const ref = useRef<BottomSheetModal>(null);
    const [target, setTarget] = useState<GoalTarget | null>(null);
    const live = line !== null && line.endedOn === null ? line : null;

    const present = () => {
        setTarget({
            accountId: account.id,
            balance: balance.exact ? balance.total : null,
            currency: account.currency,
            existing: live && { targetAmount: 0, targetDate: live.targetDate },
            name: account.name,
            payoff: t(statedKey(account, balance.total)),
        });
        ref.current?.present();
    };

    const onCommit = ({ dateChanged, targetDate }: GoalCommit) => {
        if (!latch.hold()) {
            return;
        }
        ref.current?.dismiss();
        if (!dateChanged) {
            latch.release();
            return;
        }
        setPlan({ account, db, targetDate });
    };

    const remove = () => {
        ref.current?.dismiss();
        if (live) {
            removeGoal({ db, id: live.goalId });
        }
    };

    return {
        canSet: live === null && takesPayoffPlan(account, balance.total),
        live: live !== null,
        open: () => (live ? present() : gate(account.id, present)),
        remove,
        sheet: { onCommit, onRemove: live ? remove : undefined, ref, target },
    };
}

export type PayoffPlanControls = ReturnType<typeof usePayoffPlan>;

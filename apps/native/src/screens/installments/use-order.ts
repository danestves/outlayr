import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert } from "react-native";

import { useDatabase } from "@/contexts/local-data-context";
import { useInstallmentPlans } from "@/data/installments";
import type { InstallmentRow, PlanWithStanding } from "@/data/installments-core";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { deleteInstallmentPlanCommand } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

/** `leave` goes back once, however often it is asked. */
export function useInstallmentEntry(planId: string) {
    const db = useDatabase();
    const router = useRouter();
    const nowMs = useNow();
    const entry = useInstallmentPlans(db, nowMs).find(({ plan }) => plan.id === planId) ?? null;
    const left = useRef(false);

    const leave = () => {
        if (!left.current) {
            left.current = true;
            router.back();
        }
    };

    const leaveGone = useEffectEvent(leave);
    // oxlint-disable-next-line outlayr/react-effect-budget -- leaves the screen when the live ledger query reports the plan removed, whether here or by a sync
    useEffect(() => {
        if (entry == null) {
            leaveGone();
        }
    }, [entry]);

    return { entry, leave, nowMs };
}

export function useOrderActions({ plan, standing }: PlanWithStanding, leave: () => void) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const deletePlan = useAtomAction(
        deleteInstallmentPlanCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to delete the order", Cause.squash(cause));
                notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
            },
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("warning");
                leave();
            },
        },
        SILENT
    );
    const cuotaSheetRef = useRef<BottomSheetModal>(null);
    const [editing, setEditing] = useState<InstallmentRow | null>(null);

    const edit = (row: InstallmentRow) => {
        setEditing(row);
        cuotaSheetRef.current?.present();
    };

    const pay = (all: boolean) =>
        router.push({ params: { all: all ? "1" : "0", planId: plan.id }, pathname: "/installments/pay" });

    const deletePending = () =>
        Alert.alert(t("installments.deletePending"), t("installments.deletePending.body"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => deletePlan({ db, planId: plan.id }),
                style: "destructive",
                text: t("common.delete"),
            },
        ]);

    const live = editing && (standing.rows.find(({ row }) => row.id === editing.id)?.row ?? editing);

    return { cuotaSheetRef, deletePending, edit, editing: live, pay, setEditing };
}

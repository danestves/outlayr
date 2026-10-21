import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { useDatabase } from "@/contexts/local-data-context";
import { useInstallmentPlans } from "@/data/installments";
import { installmentsRepo } from "@/data/installments-core";
import type { InstallmentRow, PlanWithStanding } from "@/data/installments-core";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

/** `leave` goes back once, however often it is asked. */
export function useInstallmentEntry(planId: string) {
    const db = useDatabase();
    const router = useRouter();
    const nowMs = useNow();
    const entry = useInstallmentPlans(db, nowMs).find(({ plan }) => plan.id === planId) ?? null;
    const left = useRef(false);

    const leave = useCallback(() => {
        if (!left.current) {
            left.current = true;
            router.back();
        }
    }, [router]);

    useEffect(() => {
        if (entry == null) {
            leave();
        }
    }, [entry, leave]);

    return { entry, leave, nowMs };
}

export function useOrderActions({ plan, standing }: PlanWithStanding, leave: () => void) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const cuotaSheetRef = useRef<BottomSheetModal>(null);
    const [editing, setEditing] = useState<InstallmentRow | null>(null);

    useEffect(() => {
        if (editing) {
            cuotaSheetRef.current?.present();
        }
    }, [editing]);

    const pay = (all: boolean) =>
        router.push({ params: { all: all ? "1" : "0", planId: plan.id }, pathname: "/installments/pay" });

    const deletePending = () =>
        Alert.alert(t("installments.deletePending"), t("installments.deletePending.body"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: async () => {
                    try {
                        await installmentsRepo.deletePlan(db, plan.id);
                        rearmInstallmentReminders(db);
                        haptics("warning");
                        leave();
                    } catch (error) {
                        console.error("Failed to delete the order", error);
                        notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
                    }
                },
                style: "destructive",
                text: t("common.delete"),
            },
        ]);

    const live = editing && (standing.rows.find(({ row }) => row.id === editing.id)?.row ?? editing);

    return { cuotaSheetRef, deletePending, editing: live, pay, setEditing };
}

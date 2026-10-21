import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { installmentsRepo } from "@/data/installments-core";
import type { InstallmentRow } from "@/data/installments-core";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

/** Edits touch one row; payments are re-allocated by date on the next read. */
export function useCuotaEditor({
    currency,
    onClose,
    row,
}: {
    currency: string;
    onClose: () => void;
    row: InstallmentRow;
}) {
    const db = useDatabase();
    const t = useTranslation();
    const haptics = useHaptics();
    const minorUnits = minorUnitsFor(currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [dueDate, setDueDate] = useState(row.dueDate);
    const [amount, setAmount] = useState(row.amount);
    const [padText, setPadText] = useState(() => numberToNumpad(row.amount, minorUnits));

    const write = async (patch: { amount?: number; dueDate?: Date }) => {
        try {
            await installmentsRepo.updateInstallment(db, row.id, patch);
            rearmInstallmentReminders(db);
            haptics("success");
        } catch (error) {
            console.error("Failed to update the installment", error);
            notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
        }
    };

    const moveTo = (next: Date) => {
        setDueDate(next);
        write({ dueDate: next }).catch(() => undefined);
    };

    const commitAmount = () => {
        padRef.current?.dismiss();
        const next = numpadToNumber(padText);
        if (next > 0 && next !== amount) {
            setAmount(next);
            write({ amount: next }).catch(() => undefined);
        }
    };

    const remove = async () => {
        try {
            await installmentsRepo.deleteInstallment(db, row.id);
            rearmInstallmentReminders(db);
            haptics("warning");
            onClose();
        } catch (error) {
            console.error("Failed to delete the installment", error);
            notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
        }
    };

    return { amount, commitAmount, dueDate, minorUnits, moveTo, padRef, padText, remove, setPadText };
}

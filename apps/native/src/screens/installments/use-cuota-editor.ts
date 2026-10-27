import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import type { InstallmentRow } from "@/data/installments-core";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { deleteInstallmentCommand, updateInstallmentCommand } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

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
    const updateInstallment = useAtomAction(
        updateInstallmentCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to update the installment", Cause.squash(cause));
                notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
            },
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("success");
            },
        },
        SILENT
    );
    const deleteInstallment = useAtomAction(
        deleteInstallmentCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to delete the installment", Cause.squash(cause));
                notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
            },
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("warning");
                onClose();
            },
        },
        SILENT
    );
    const minorUnits = minorUnitsFor(currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [dueDate, setDueDate] = useState(row.dueDate);
    const [amount, setAmount] = useState(row.amount);
    const [padText, setPadText] = useState(() => numberToNumpad(row.amount, minorUnits));

    const write = (patch: { amount?: number; dueDate?: Date }) => updateInstallment({ db, id: row.id, patch });

    const moveTo = (next: Date) => {
        setDueDate(next);
        write({ dueDate: next });
    };

    const commitAmount = () => {
        padRef.current?.dismiss();
        const next = numpadToNumber(padText);
        if (next > 0 && next !== amount) {
            setAmount(next);
            write({ amount: next });
        }
    };

    const remove = () => deleteInstallment({ db, id: row.id });

    return { amount, commitAmount, dueDate, minorUnits, moveTo, padRef, padText, remove, setPadText };
}

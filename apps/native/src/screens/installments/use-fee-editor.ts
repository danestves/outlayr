import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { lastFeeAmount } from "@/data/installments-core";
import type { InstallmentRow } from "@/data/installments-core";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { addInstallmentFeeCommand, removeInstallmentFeeCommand } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export function useFeeEditor({
    accountId,
    currency,
    row,
}: {
    accountId: string;
    currency: string;
    row: InstallmentRow;
}) {
    const db = useDatabase();
    const addFee = useAtomCommand(addInstallmentFeeCommand, SILENT);
    const removeFee = useAtomCommand(removeInstallmentFeeCommand, SILENT);
    const t = useTranslation();
    const haptics = useHaptics();
    const minorUnits = minorUnitsFor(currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [padText, setPadText] = useState("");

    const write = async (next: number) => {
        const save = async () =>
            next > 0
                ? unwrapAtomCommand(await addFee({ db, fee: { amount: next, installmentId: row.id } }))
                : unwrapAtomCommand(await removeFee({ db, installmentId: row.id }));
        const saving = save();
        const feedback = next > 0 ? "success" : "warning";
        try {
            await saving;
            rearmInstallmentReminders(db);
            haptics(feedback);
        } catch (error) {
            console.error("Failed to save the late fee", error);
            notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
        }
    };

    const open = () => {
        setPadText(numberToNumpad(row.fee > 0 ? row.fee : (lastFeeAmount(db, accountId) ?? 0), minorUnits));
        padRef.current?.present();
    };

    const commit = () => {
        padRef.current?.dismiss();
        const next = numpadToNumber(padText);
        if (next !== row.fee) {
            write(next).catch(() => undefined);
        }
    };

    const remove = () => {
        write(0).catch(() => undefined);
    };

    return { commit, minorUnits, open, padRef, padText, remove, setPadText };
}

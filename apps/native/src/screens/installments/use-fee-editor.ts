import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { lastFeeAmount } from "@/data/installments-core";
import type { InstallmentRow } from "@/data/installments-core";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { addInstallmentFeeCommand, removeInstallmentFeeCommand } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

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
    const t = useTranslation();
    const haptics = useHaptics();
    const onFailure = (cause: Cause.Cause<unknown>) => {
        console.error("Failed to save the late fee", Cause.squash(cause));
        notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
    };
    const addFee = useAtomAction(
        addInstallmentFeeCommand,
        {
            onFailure,
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("success");
            },
        },
        SILENT
    );
    const removeFee = useAtomAction(
        removeInstallmentFeeCommand,
        {
            onFailure,
            onSuccess: () => {
                rearmInstallmentReminders(db);
                haptics("warning");
            },
        },
        SILENT
    );
    const minorUnits = minorUnitsFor(currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [padText, setPadText] = useState("");

    const write = (next: number) =>
        next > 0
            ? addFee({ db, fee: { amount: next, installmentId: row.id } })
            : removeFee({ db, installmentId: row.id });

    const open = () => {
        setPadText(numberToNumpad(row.fee > 0 ? row.fee : (lastFeeAmount(db, accountId) ?? 0), minorUnits));
        padRef.current?.present();
    };

    const commit = () => {
        padRef.current?.dismiss();
        const next = numpadToNumber(padText);
        if (next !== row.fee) {
            write(next);
        }
    };

    const remove = () => {
        write(0);
    };

    return { commit, minorUnits, open, padRef, padText, remove, setPadText };
}

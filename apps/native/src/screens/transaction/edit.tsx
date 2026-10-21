import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { notifyEditsNotRestored } from "@/components/edits-discarded-snackbar";
import { RestingSheetFrame } from "@/components/resting-sheet-frame";
import { ScreenHeader } from "@/components/screen-header";
import { TransactionForm } from "@/components/transaction-form";
import type { TransactionFormDraft } from "@/components/transaction-form";
import { useDatabase } from "@/contexts/local-data-context";
import { getTransactionById } from "@/data/transactions-core";
import type { Transaction } from "@/data/transactions-core";
import { savedTransfer } from "@/data/transfers-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useRestingSheet } from "@/hooks/use-resting-sheet";
import { useTranslation } from "@/i18n/context";
import { createDraftStash } from "@/lib/draft-stash";
import { EditTransfer } from "@/screens/transfers/edit";

export function EditTransaction({ id }: { id: string }) {
    const router = useRouter();
    const db = useDatabase();
    // Read synchronously: the database is open and the driver is on the JS thread, so the form never mounts empty.
    const [initial] = useState(() => {
        const row = id ? getTransactionById(db, id) : null;
        const purchase = row?.feeForId ? getTransactionById(db, row.feeForId) : null;
        return purchase != null && purchase.deletedAt == null ? purchase : row;
    });
    const [transferId] = useState(() =>
        initial?.transferId != null && savedTransfer(db, initial.transferId) !== null ? initial.transferId : null
    );

    useEffect(() => {
        if (initial == null) {
            router.back();
        }
    }, [initial, router]);

    if (initial == null) {
        return null;
    }
    if (transferId !== null) {
        return <EditTransfer id={transferId} />;
    }
    return <TransactionSheet initial={initial} />;
}

/** Edits an "Edits discarded" Undo carries back, with the version they were made on. */
const entryDrafts = createDraftStash<{ edits: TransactionFormDraft; updatedAt: number }>();

function TransactionSheet({ initial }: { initial: Transaction }) {
    const router = useRouter();
    const db = useDatabase();
    const readDraft = useRef<(() => TransactionFormDraft) | null>(null);
    const version = initial.updatedAt.getTime();
    // Only edits made on this version come back: older ones would overwrite whatever changed it.
    const [restore] = useState(() => {
        const held = entryDrafts.take(initial.id);
        return held?.updatedAt === version ? held.edits : undefined;
    });
    const { leave, setDirty } = useDiscardGuard({
        restore: (edits: TransactionFormDraft) => {
            const current = getTransactionById(db, initial.id);
            const untouched = current != null && current.deletedAt === null && current.updatedAt.getTime() === version;
            if (!untouched) {
                notifyEditsNotRestored();
                return;
            }
            entryDrafts.put(initial.id, { edits, updatedAt: version });
            router.push(`/transactions/${initial.id}`);
        },
        snapshot: () => readDraft.current?.() ?? null,
    });
    const t = useTranslation();
    const { requestDelete } = useDeferredDelete("row");
    const { awake, height, rest, sheet } = useRestingSheet(t("transaction.edit.title"));

    // Only the tap that leaves deletes: a second one, or one during a save, would flush the first's undo.
    const deleteTransaction = () => {
        if (leave()) {
            requestDelete(initial.id);
        }
    };

    return (
        <>
            <Stack.Screen options={sheet} />
            <ScreenHeader title={awake ? t("transaction.edit.title") : undefined} />
            <CloseToolbar placement="left" />
            <RestingSheetFrame height={height}>
                <TransactionForm
                    db={db}
                    draftRef={readDraft}
                    initial={initial}
                    mode="edit"
                    onDelete={deleteTransaction}
                    onDirtyChange={setDirty}
                    onDone={leave}
                    rest={rest}
                    restore={restore}
                />
            </RestingSheetFrame>
        </>
    );
}

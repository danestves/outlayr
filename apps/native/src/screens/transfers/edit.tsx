import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { notifyEditsNotRestored } from "@/components/edits-discarded-snackbar";
import { RestingSheetFrame } from "@/components/resting-sheet-frame";
import { ScreenHeader } from "@/components/screen-header";
import TransferEditor from "@/components/transfer-editor";
import type { TransferEditorDraft } from "@/components/transfer-editor";
import { useDatabase } from "@/contexts/local-data-context";
import { sameSavedTransfer, savedTransfer } from "@/data/transfers-core";
import type { SavedTransfer } from "@/data/transfers-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useRestingSheet } from "@/hooks/use-resting-sheet";
import { useTranslation } from "@/i18n/context";
import { createDraftStash } from "@/lib/draft-stash";

/** Edits an "Edits discarded" Undo carries back, with the transfer as it was then. */
const transferDrafts = createDraftStash<{ edits: TransferEditorDraft; saved: SavedTransfer }>();

export function EditTransfer({ id }: { id: string }) {
    const router = useRouter();
    const db = useDatabase();
    const t = useTranslation();
    const { requestDelete } = useDeferredDelete("row");
    const { awake, height, rest, sheet } = useRestingSheet(t("transfers.title"));
    const [saved] = useState(() => savedTransfer(db, id));
    const readDraft = useRef<(() => TransferEditorDraft) | null>(null);
    // Only edits made on this transfer come back: older ones would overwrite whatever changed it.
    const [restore] = useState(() => {
        const held = transferDrafts.take(id);
        return held !== undefined && saved !== null && sameSavedTransfer(held.saved, saved) ? held.edits : undefined;
    });
    const { leave, setDirty } = useDiscardGuard({
        restore: (edits: TransferEditorDraft) => {
            const current = savedTransfer(db, id);
            if (saved === null || current === null || !sameSavedTransfer(saved, current)) {
                notifyEditsNotRestored();
                return;
            }
            transferDrafts.put(id, { edits, saved });
            router.push(`/transactions/transfers/${id}`);
        },
        snapshot: () => readDraft.current?.() ?? null,
    });

    useEffect(() => {
        if (saved === null) {
            router.back();
        }
    }, [saved, router]);

    if (saved === null) {
        return null;
    }

    return (
        <>
            <Stack.Screen options={sheet} />
            <ScreenHeader title={awake ? t("transfers.title") : undefined} />
            <CloseToolbar placement="left" />

            <RestingSheetFrame height={height}>
                <TransferEditor
                    draftRef={readDraft}
                    onDelete={() => {
                        if (leave()) {
                            requestDelete(id);
                        }
                    }}
                    onDirtyChange={setDirty}
                    onDone={leave}
                    rest={rest}
                    restore={restore}
                    saved={saved}
                />
            </RestingSheetFrame>
        </>
    );
}

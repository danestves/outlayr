import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { deletionOf } from "@/lib/delete-writes";

const UNDO_MS = 6000;

// Held outside React: useToast() subscribes its caller, and subscribing this screen loops the renderer.
export const deleteToasts = createToaster();

/** Hides entries at once in a held commit, so Undo is a local rollback. */
export function useDeleteEntries() {
    const committer = useLedgerCommitter();
    const { ledger } = useDashboard();
    const { deleted } = useIntlayer("dashboard-transactions");
    return (ids: Iterable<string>) => {
        const { count, rows } = deletionOf(ledger.books, ids, Date.now());
        if (count === 0) {
            return;
        }
        const held = committer.commit(rows, { holdMs: UNDO_MS });
        const toastId = deleteToasts.add({
            actionProps: {
                children: deleted.undo.value,
                onClick: () => {
                    deleteToasts.close(toastId);
                    held.undo();
                },
            },
            timeout: UNDO_MS,
            title: count === 1 ? deleted.one.value : deleted.many({ count }).value,
        });
        setTimeout(() => deleteToasts.close(toastId), UNDO_MS);
        void held.settled.then((outcome) => {
            if (outcome.status === "failed") {
                deleteToasts.add({ title: deleted.failed.value, type: "destructive" });
            }
        });
    };
}

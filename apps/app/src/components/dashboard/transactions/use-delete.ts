import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import type { ToastSurface } from "@/components/dashboard/shell/ledger-committer";
import { deletionOf } from "@/lib/delete-writes";

// Held outside React: useToast() subscribes its caller, and subscribing this screen loops the renderer.
export const deleteToasts = createToaster();

export const entryNotices: ToastSurface = { holdMs: 6000, toasts: deleteToasts };

/** Hides entries at once in a held commit, so Undo is a local rollback. */
export function useDeleteEntries() {
    const committer = useLedgerCommitter(entryNotices);
    const { ledger } = useDashboard();
    const { deleted } = useIntlayer("dashboard-transactions");
    return (ids: Iterable<string>) => {
        const { count, rows } = deletionOf(ledger.books, ids, Date.now());
        if (count > 0) {
            committer.commitWithUndo(rows, {
                failed: deleted.failed.value,
                text: count === 1 ? deleted.one.value : deleted.many({ count }).value,
            });
        }
    };
}

import { useRouteContext } from "@tanstack/react-router";
import { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { stageRows } from "@/lib/ledger-commit";

import { deletionOf } from "./delete";

const UNDO_MS = 6000;

// Held outside React: useToast() subscribes its caller, and subscribing this screen loops the renderer.
export const deleteToasts = createToaster();

/** Hides entries at once and pushes when the undo window ends, so Undo is a local rollback. */
export function useDeleteEntries() {
    const { dbClient } = useRouteContext({ from: "__root__" });
    const { ledger } = useDashboard();
    const { deleted } = useIntlayer("dashboard-transactions");
    return (ids: Iterable<string>) => {
        const { count, rows } = deletionOf(ledger.books, ids, Date.now());
        if (count === 0) {
            return;
        }
        const transaction = stageRows(dbClient, rows);
        let toastId = "";
        const finish = () => {
            clearTimeout(timer);
            window.removeEventListener("pagehide", settle);
        };
        function settle() {
            finish();
            deleteToasts.close(toastId);
            transaction.commit().catch(() => {
                deleteToasts.add({ title: deleted.failed.value, type: "destructive" });
            });
        }
        const timer = setTimeout(settle, UNDO_MS);
        window.addEventListener("pagehide", settle);
        toastId = deleteToasts.add({
            actionProps: {
                children: deleted.undo.value,
                onClick: () => {
                    finish();
                    deleteToasts.close(toastId);
                    transaction.rollback();
                },
            },
            timeout: UNDO_MS,
            title: count === 1 ? deleted.one.value : deleted.many({ count }).value,
        });
    };
}

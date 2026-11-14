import { useMatch } from "@tanstack/react-router";
import type { createToaster } from "panelui-web/toast";
import { useIntlayer } from "react-intlayer";

import { UNDO_HOLD_MS, useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import { noticedCommits } from "@/lib/commit-notices";
import type { NoticeHost } from "@/lib/commit-notices";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { ledgerCommitter } from "@/lib/ledger-committer";
import { ledgerBooks } from "@/lib/ledger-db";

import { useDashboard } from "./dashboard";

export interface ToastSurface {
    holdMs: number;
    toasts: ReturnType<typeof createToaster>;
    tone?: "success";
}

const toastHost = ({ holdMs, toasts, tone }: ToastSurface, undo: string): NoticeHost => ({
    holdMs,
    show: ({ detail, failed, onUndo, text }) => {
        const id = toasts.add({
            actionProps: onUndo && {
                children: undo,
                onClick: () => {
                    toasts.close(id);
                    onUndo();
                },
            },
            description: detail,
            timeout: onUndo ? holdMs : undefined,
            title: text,
            type: failed ? "destructive" : tone,
        });
        return () => toasts.close(id);
    },
});

export function useLedgerCommitter(surface?: ToastSurface) {
    const db = useLedgerDb();
    // A pending screen draws the real screen before the loader has answered, so the loader data can be missing.
    const userId = useMatch({ from: "/_account/_app", select: (match) => match.loaderData?.userId });
    const { ledger } = useDashboard();
    const { toast } = useAccountFlows();
    const { flows } = useIntlayer("dashboard-accounts");
    const committer = ledgerCommitter(db, userId);
    const host = surface ? toastHost(surface, flows.undo.value) : { holdMs: UNDO_HOLD_MS, show: toast };
    return {
        ...noticedCommits(committer, host),
        current: (): Ledger => ({ ...ledger, books: ledgerBooks(db) }),
        notify: host.show,
        resume: committer.resume,
    };
}

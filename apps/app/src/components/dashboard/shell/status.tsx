import DatabaseSync01Icon from "@hugeicons/core-free-icons/DatabaseSync01Icon";
import WifiOff01Icon from "@hugeicons/core-free-icons/WifiOff01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Button } from "panelui-web/button";
import { useState, useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { INITIAL_SYNC, readSync, subscribeSync } from "@/lib/sync-status";

import { useLedgerCommitter } from "./ledger-committer";

const subscribeOnline = (listener: () => void) => {
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);
    return () => {
        window.removeEventListener("online", listener);
        window.removeEventListener("offline", listener);
    };
};

const useOnline = () =>
    useSyncExternalStore(
        subscribeOnline,
        () => navigator.onLine,
        () => true
    );

const useSync = () => useSyncExternalStore(subscribeSync, readSync, () => INITIAL_SYNC);

export function OfflineBar() {
    const online = useOnline();
    const { waiting } = useSync();
    const { offline: copy } = useIntlayer("dashboard-shell");
    if (online) {
        return null;
    }
    return (
        <output className="border-app-warn/30 bg-app-warn/10 text-app-warn text-app-caption rounded-app-sm mx-4 mt-3 flex items-center gap-2 border px-2.5 py-1 sm:mx-6">
            <HugeiconsIcon className="shrink-0" icon={WifiOff01Icon} size={14} strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate">{copy.line}</span>
            {waiting > 0 ? <span className="shrink-0 font-mono">{copy.waiting({ count: waiting })}</span> : null}
        </output>
    );
}

const CARD =
    "app-shell ph-no-capture bg-popover text-popover-foreground border-border rounded-app-xl text-app-label fixed end-4 bottom-4 z-40 flex w-80 items-center gap-3 border p-3 shadow-(--shadow-app-popover)";

export function SyncCard() {
    const online = useOnline();
    const { peak, status, waiting } = useSync();
    const committer = useLedgerCommitter();
    const { sync: copy } = useIntlayer("dashboard-shell");
    const [draining, setDraining] = useState(false);
    if ((!online || status === "failed") && !draining) {
        setDraining(true);
    } else if (online && status === "upToDate" && draining) {
        setDraining(false);
    }
    if (!online) {
        return null;
    }
    if (status === "failed") {
        let line = copy.failed({ count: waiting }).value;
        if (waiting === 0) {
            line = copy.failedNone.value;
        } else if (waiting === 1) {
            line = copy.failedOne.value;
        }
        return (
            <div className={CARD} role="alert">
                <HugeiconsIcon className="text-destructive shrink-0" icon={DatabaseSync01Icon} size={16} />
                <span className="min-w-0 flex-1">{line}</span>
                <Button onClick={committer.resume} size="sm" variant="outline">
                    {copy.retry}
                </Button>
            </div>
        );
    }
    if (!draining || status !== "syncing" || peak === 0) {
        return null;
    }
    const done = peak - waiting;
    return (
        <output className={CARD}>
            <HugeiconsIcon className="text-app-tint shrink-0" icon={DatabaseSync01Icon} size={16} />
            <span className="font-medium">{copy.syncing}</span>
            <span className="bg-app-fill h-1 min-w-0 flex-1 overflow-hidden rounded-full">
                <span className="bg-foreground block h-full" style={{ width: `${(done / peak) * 100}%` }} />
            </span>
            <span className="text-muted-foreground shrink-0 font-mono">{copy.progress({ done, total: peak })}</span>
        </output>
    );
}

let leaving = false;

export const leaveSession = () => {
    leaving = true;
};

export function SessionExpired() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const href = useLocation({ select: (location) => location.href });
    const navigate = useNavigate();
    const { session: copy } = useIntlayer("dashboard-shell");
    const [seen, setSeen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    if (isAuthenticated && (!seen || dismissed)) {
        setSeen(true);
        setDismissed(false);
    }
    const expired = seen && !isLoading && !isAuthenticated && !leaving;
    return (
        <ConfirmDialog
            action={copy.signIn}
            body={copy.body}
            cancel={copy.later}
            onAction={() => navigate({ search: { redirect: href }, to: "/login" })}
            onOpenChange={(open) => setDismissed(!open)}
            open={expired && !dismissed}
            title={copy.title}
        />
    );
}

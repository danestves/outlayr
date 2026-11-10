import * as Cause from "effect/Cause";
import { useFocusEffect } from "expo-router";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { useMeta } from "@/data/app-meta";
import type { Database } from "@/db/client";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { askForReviewIfPendingCommand } from "@/state/review-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

const ENTRY_SETTLE_MS = 2000;

const askSoon = (db: Database) => {
    const timer = setTimeout(() => {
        fireAtomCommand(
            appAtomRegistry,
            askForReviewIfPendingCommand,
            db,
            { onFailure: (cause) => console.warn("[outlayr] review ask failed", Cause.squash(cause)) },
            SILENT
        );
    }, ENTRY_SETTLE_MS);
    return () => clearTimeout(timer);
};

export function useReviewAsk(db: Database): void {
    const pending = useMeta(db, "reviewPending");
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const ready = pending && lockOpen && !covered;

    useFocusEffect(() => (ready ? askSoon(db) : undefined));
}

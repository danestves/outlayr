import { eq } from "drizzle-orm";
import * as Cause from "effect/Cause";
import { useFocusEffect } from "expo-router";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
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
    const pending = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.reviewPending)),
        (rows) => rows[0]?.value === "1"
    );
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const ready = pending && lockOpen && !covered;

    useFocusEffect(() => (ready ? askSoon(db) : undefined));
}

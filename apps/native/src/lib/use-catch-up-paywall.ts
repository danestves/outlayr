import * as Cause from "effect/Cause";
import { useRouter, useSegments } from "expo-router";
import { useSyncExternalStore } from "react";

import { useUpdateWaiting } from "@/components/update-sheet";
import { useMeta } from "@/data/app-meta";
import { useTransactionCount } from "@/data/transactions";
import type { Database } from "@/db/client";
import { catchUpPaywallDue } from "@/domain/catch-up-paywall";
import { paywallHref } from "@/domain/paywall-trigger";
import { useProLocked } from "@/hooks/use-pro-locked";
import { freshEntries } from "@/lib/fresh-entries";
import { useWhen } from "@/lib/lifecycle";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { markPaywallSeenCommand } from "@/state/settings-flow-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

let released = false;

export function useCatchUpPaywall(db: Database, ready: boolean): void {
    const router = useRouter();
    const segments: readonly string[] = useSegments();
    const updateDue = useUpdateWaiting();
    const savedThisSession = useSyncExternalStore(freshEntries.subscribe, freshEntries.marked);
    const arriving = useSyncExternalStore(freshEntries.subscribe, freshEntries.arriving);
    const transactions = useTransactionCount(db);
    const locked = useProLocked();
    const seen = useMeta(db, "paywallSeen");
    const reviewPending = useMeta(db, "reviewPending");
    const due = catchUpPaywallDue({
        arriving,
        locked,
        onLog: segments[1] === "(transactions)",
        onTabs: ready && segments[0] === "(tabs)",
        reviewPending,
        savedThisSession,
        seen,
        transactions,
        updateDue,
    });

    useWhen(due, () => {
        if (released) {
            return;
        }
        released = true;
        fireAtomCommand(
            appAtomRegistry,
            markPaywallSeenCommand,
            db,
            {
                onFailure: (cause) =>
                    console.warn("[outlayr] marking the catch-up paywall seen failed", Cause.squash(cause)),
                onSettled: () => router.push(paywallHref("catch_up")),
            },
            SILENT
        );
    });
}

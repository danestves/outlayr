import * as Cause from "effect/Cause";
import { useSegments } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";

import { useUpdateWaiting } from "@/components/update-sheet";
import { useAccountOfferHeld } from "@/data/onboarding";
import { useTransactionCount } from "@/data/transactions";
import type { Database } from "@/db/client";
import { accountOfferDue } from "@/domain/account-offer";
import { useAuthSession } from "@/lib/auth-session";
import { freshEntries } from "@/lib/fresh-entries";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { awaitReminderPromptCommand, releaseAccountOfferCommand } from "@/state/onboarding-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

let released = false;

export function useAccountOffer(db: Database, ready: boolean): void {
    const segments: readonly string[] = useSegments();
    const { gate } = useAuthSession();
    const updateDue = useUpdateWaiting();
    const savedThisSession = useSyncExternalStore(freshEntries.subscribe, freshEntries.marked);
    const arriving = useSyncExternalStore(freshEntries.subscribe, freshEntries.arriving);
    const held = useAccountOfferHeld(db);
    const transactions = useTransactionCount(db);
    const due = accountOfferDue({
        arriving,
        held,
        onLog: segments[1] === "(transactions)",
        onTabs: ready && segments[0] === "(tabs)",
        savedThisSession,
        signedOut: gate === "signed-out",
        transactions,
        updateDue,
    });

    // oxlint-disable-next-line outlayr/react-effect-budget -- waits out the OS reminder prompt
    useEffect(() => {
        if (!due || released) {
            return;
        }
        let live = true;
        fireAtomCommand(
            appAtomRegistry,
            awaitReminderPromptCommand,
            db,
            {
                onFailure: (cause) =>
                    console.warn("[outlayr] reminder prompt before the account offer failed", Cause.squash(cause)),
                onSettled: () => {
                    if (!live || released) {
                        return;
                    }
                    released = true;
                    fireAtomCommand(
                        appAtomRegistry,
                        releaseAccountOfferCommand,
                        db,
                        {
                            onFailure: (cause) =>
                                console.warn("[outlayr] releasing the account offer failed", Cause.squash(cause)),
                        },
                        SILENT
                    );
                },
            },
            SILENT
        );
        return () => {
            live = false;
        };
    }, [db, due]);
}

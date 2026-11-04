import * as Cause from "effect/Cause";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";

import { useUpdateWaiting } from "@/components/update-sheet";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useFirstEntryOfferShown } from "@/data/onboarding";
import { useAiConsent } from "@/data/settings";
import { useTransactionCount } from "@/data/transactions";
import type { Database } from "@/db/client";
import { firstEntryOfferDue } from "@/domain/first-entry-offer";
import { paywallHref } from "@/domain/paywall-trigger";
import { purchaseResume } from "@/domain/purchase-resume";
import { useProLocked } from "@/hooks/use-pro-locked";
import { useAuthSession } from "@/lib/auth-session";
import { freshEntries } from "@/lib/fresh-entries";
import { purchaseIntent, usePurchaseIntent } from "@/lib/purchase-intent";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { awaitReminderPromptCommand, markFirstEntryOfferCommand } from "@/state/onboarding-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

let offered = false;

export function usePaywallOpeners(db: Database, ready: boolean): void {
    const router = useRouter();
    const pathname = usePathname();
    const segments: readonly string[] = useSegments();
    const onTabs = ready && segments[0] === "(tabs)";
    const { accountId, gate } = useAuthSession();
    const consent = useAiConsent(db);
    const updateDue = useUpdateWaiting();
    const entitlement = useRevenueCat();
    const intent = usePurchaseIntent();
    const locked = useProLocked();
    const savedThisSession = useSyncExternalStore(freshEntries.subscribe, freshEntries.marked);
    const arriving = useSyncExternalStore(freshEntries.subscribe, freshEntries.arriving);
    const shown = useFirstEntryOfferShown(db);
    const transactions = useTransactionCount(db);
    const offerDue = firstEntryOfferDue({
        arriving,
        consentDue: gate === "signed-in" && consent === "unanswered",
        locked,
        onLog: segments[1] === "(transactions)",
        onTabs,
        savedThisSession,
        shown,
        transactions,
        updateDue,
    });
    const resume = purchaseResume({ accountId, entitlement, intent, onTabs, pathname });

    // oxlint-disable-next-line outlayr/react-effect-budget -- waits out the OS reminder prompt
    useEffect(() => {
        if (!offerDue || offered) {
            return;
        }
        let live = true;
        fireAtomCommand(
            appAtomRegistry,
            awaitReminderPromptCommand,
            db,
            {
                onFailure: (cause) =>
                    console.warn("[outlayr] reminder prompt before the Pro offer failed", Cause.squash(cause)),
                onSettled: () => {
                    if (!live || offered) {
                        return;
                    }
                    offered = true;
                    router.push(paywallHref("first_entry"));
                    fireAtomCommand(
                        appAtomRegistry,
                        markFirstEntryOfferCommand,
                        db,
                        {
                            onFailure: (cause) =>
                                console.warn("[outlayr] marking the Pro offer failed", Cause.squash(cause)),
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
    }, [db, offerDue, router]);

    // oxlint-disable-next-line outlayr/react-effect-budget -- signing in swaps the root stack under the paywall
    useEffect(() => {
        const taken = purchaseIntent.get();
        if (resume === null || taken === null) {
            return;
        }
        if (resume === "drop") {
            purchaseIntent.clear();
            return;
        }
        purchaseIntent.hand();
        router.push(paywallHref(taken.trigger));
    }, [resume, router]);
}

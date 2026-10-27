import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { eq } from "drizzle-orm";
import * as Cause from "effect/Cause";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { createAdoptionSlot } from "@/data/adoption-retry";
import type { AdoptionSlot } from "@/data/adoption-retry";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { appMeta } from "@/db/schema";
import { choiceActions } from "@/domain/ledger-adoption";
import type { AdoptionChoice } from "@/domain/ledger-adoption";
import { useProLocked, useProPending } from "@/hooks/use-pro-locked";
import { subscribeAppState } from "@/lib/app-state";
import { useAuthSession } from "@/lib/auth-session";
import { reconcileLedgerCommand, retryLedgerReconcileCommand } from "@/state/adoption-commands";
import { SILENT } from "@/state/atom-command";
import { completeAdoptionCommand } from "@/state/lifecycle-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

export type AdoptionStatus = "resolving" | "settled" | "ask" | "working";

export interface LedgerAdoption {
    choose: (choice: AdoptionChoice) => void;
    failed: boolean;
    status: AdoptionStatus;
}

const SETTLED: LedgerAdoption = {
    choose: () => {
        // Nothing left to choose once adoption has settled.
    },
    failed: false,
    status: "settled",
};

const LedgerAdoptionContext = createContext<LedgerAdoption>(SETTLED);

export function useLedgerAdoption(): LedgerAdoption {
    return use(LedgerAdoptionContext);
}

function shownStatus(holding: boolean, skipping: boolean, reconciled: AdoptionStatus): AdoptionStatus {
    if (holding) {
        return "resolving";
    }
    if (skipping) {
        return "settled";
    }
    return reconciled;
}

/**
 * Must sit below the splash gate. An undecidable plan or a failure settles without writing the marker, so the
 * reconciliation stays due for the next launch or a build that can run it.
 */
export function LedgerAdoptionProvider({ children }: { children: ReactNode }) {
    const db = useDatabase();
    const registry = use(RegistryContext);
    const { accountId } = useAuthSession();
    // Read during render rather than awaited, so a reconciled device never shows a frame of the cover.
    const adoptedAccount = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.ledgerAdoption)),
        (rows) => rows[0]?.value ?? null
    );
    const settled = accountId != null && adoptedAccount === accountId;

    const [reconciled, setReconciled] = useState<AdoptionStatus>("resolving");
    const [failed, setFailed] = useState(false);
    const confirmedFree = useProLocked();
    const entitlementPending = useProPending();
    // Held while the entitlement resolves: settling hands the local ledger to `RootStack`, and a Pro customer
    // editing it before reconciliation would turn an automatic adoption into a merge.
    const holding = accountId != null && !settled && entitlementPending;
    // Skipped only for a CONFIRMED Free customer: any other answer (including a failed store lookup) reconciles,
    // because settling would claim a check that never ran.
    const skipping = !holding && (accountId == null || settled || confirmedFree);
    const reconcilingFor = holding || skipping ? null : accountId;
    const status = shownStatus(holding, skipping, reconciled);

    const [startedFor, setStartedFor] = useState<string | null>(null);
    if (reconcilingFor !== startedFor) {
        setStartedFor(reconcilingFor);
        if (reconcilingFor !== null) {
            setReconciled("resolving");
            setFailed(false);
        }
    }
    const retryByAccount = useRef<AdoptionSlot | null>(null);

    // oxlint-disable-next-line outlayr/react-effect-budget -- runs the account's ledger reconciliation and its one foreground retry on AppState, cancelled when the account or database changes
    useEffect(() => {
        if (reconcilingFor === null) {
            return;
        }
        let cancelled = false;
        const { current } = retryByAccount;
        const slot = current?.accountId === reconcilingFor ? current : createAdoptionSlot(reconcilingFor);
        retryByAccount.current = slot;
        const input = {
            db,
            report: (outcome: AdoptionStatus) => {
                if (!cancelled) {
                    setReconciled(outcome);
                }
            },
            slot,
        };

        fireAtomCommand(registry, reconcileLedgerCommand, input, {});
        const unsubscribe = subscribeAppState((state) => {
            if (state === "active") {
                fireAtomCommand(registry, retryLedgerReconcileCommand, input, {});
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [db, reconcilingFor, registry]);

    const choose = useCallback(
        (choice: AdoptionChoice) => {
            if (accountId == null) {
                return;
            }
            setReconciled("working");
            setFailed(false);
            fireAtomCommand(
                registry,
                completeAdoptionCommand,
                { accountId, actions: choiceActions(choice), db },
                {
                    onFailure: (cause) => {
                        console.warn("[outlayr] ledger adoption failed", Cause.squash(cause));
                        setFailed(true);
                        setReconciled("ask");
                    },
                    onSuccess: () => setReconciled("settled"),
                },
                SILENT
            );
        },
        [db, accountId, registry]
    );

    const value = useMemo(() => ({ choose, failed, status }), [status, failed, choose]);

    return <LedgerAdoptionContext.Provider value={value}>{children}</LedgerAdoptionContext.Provider>;
}

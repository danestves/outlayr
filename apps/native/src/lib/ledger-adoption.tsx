import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { eq } from "drizzle-orm";
import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState } from "react-native";

import { useDatabase } from "@/contexts/local-data-context";
import { createSingleAdoptionRetry } from "@/data/adoption-retry";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { appMeta } from "@/db/schema";
import { choiceActions } from "@/domain/ledger-adoption";
import type { AdoptionChoice } from "@/domain/ledger-adoption";
import { useProLocked, useProPending } from "@/hooks/use-pro-locked";
import { useAuthSession } from "@/lib/auth-session";
import { SILENT, runAtomCommand } from "@/state/atom-command";
import { completeAdoptionCommand, reconcileAdoptionCommand, runLifecycleCommand } from "@/state/lifecycle-commands";

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
    const retryByAccount = useRef<{
        accountId: string;
        inFlight: Promise<AdoptionStatus> | null;
        retry: ReturnType<typeof createSingleAdoptionRetry>;
    } | null>(null);

    useEffect(() => {
        if (reconcilingFor === null) {
            return;
        }
        const account = reconcilingFor;
        let cancelled = false;
        if (retryByAccount.current?.accountId !== account) {
            retryByAccount.current = { accountId: account, inFlight: null, retry: createSingleAdoptionRetry() };
        }
        const slot = retryByAccount.current;
        const { retry } = slot;

        const runReconcile = async (): Promise<AdoptionStatus> => {
            try {
                const outcome = await runLifecycleCommand(reconcileAdoptionCommand, { accountId: account, db });
                if (outcome === "ask") {
                    return "ask";
                }
                if (outcome === "defer") {
                    retry.schedule();
                }
                return "settled";
            } catch (error: unknown) {
                console.warn("[outlayr] ledger adoption deferred", error);
                retry.schedule();
                return "settled";
            }
        };

        const reconcile = async () => {
            if (slot.inFlight === null) {
                slot.inFlight = runReconcile().finally(() => {
                    slot.inFlight = null;
                });
            }
            const outcome = await slot.inFlight;
            if (!cancelled) {
                setReconciled(outcome);
            }
        };

        reconcile();
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                retry.run(reconcile);
            }
        });

        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, [db, reconcilingFor]);

    const choose = useCallback(
        (choice: AdoptionChoice) => {
            if (accountId == null) {
                return;
            }
            setReconciled("working");
            setFailed(false);
            runAtomCommand(
                registry,
                completeAdoptionCommand,
                { accountId, actions: choiceActions(choice), db },
                SILENT
            ).then((result) => {
                if (AsyncResult.isFailure(result)) {
                    console.warn("[outlayr] ledger adoption failed", Cause.squash(result.cause));
                    setFailed(true);
                    setReconciled("ask");
                    return;
                }
                setReconciled("settled");
            });
        },
        [db, accountId, registry]
    );

    const value = useMemo(() => ({ choose, failed, status }), [status, failed, choose]);

    return <LedgerAdoptionContext.Provider value={value}>{children}</LedgerAdoptionContext.Provider>;
}

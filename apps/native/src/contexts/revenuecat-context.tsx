import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { useAuthSession } from "@/lib/auth-session";
import { mirrorEntitlement } from "@/lib/entitlement-mirror";
import {
    configureRevenueCat,
    getPackages as getRevenueCatPackages,
    hasProEntitlement,
    eligibleForTrial,
    identifyUser,
    logOutUser,
    onCustomerInfoUpdated,
    purchaseAndCheckPro,
    purchaseCancelled,
    refreshProEntitlement,
    restoreAndCheckPro,
    setCustomerProfile,
} from "@/lib/revenuecat";

export type PurchaseOutcome = "cancelled" | "pro" | "unentitled";

export interface RevenueCatValue {
    getPackages: () => Promise<PurchasesPackage[]>;
    eligibleForTrial: (productIds: readonly string[]) => Promise<ReadonlySet<string>>;
    isConfigured: boolean;
    /** Bounded by the requests themselves, so a gate can hold on it without risking a hold that never ends. */
    isPending: boolean;
    /** False until the first identity sync answers, so no gate reads a guess. */
    isResolved: boolean;
    isPro: boolean;
    /** Whether the account carries the entitlement the SERVER gates on. */
    isMirrored: boolean;
    mirrorEntitlement: () => Promise<boolean>;
    purchasePackage: (pack: PurchasesPackage) => Promise<PurchaseOutcome>;
    refreshEntitlement: () => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
}

const NOT_CONFIGURED: RevenueCatValue = {
    eligibleForTrial: async () => new Set(),
    getPackages: async () => [],
    isConfigured: false,
    isMirrored: false,
    isPending: false,
    isPro: false,
    isResolved: true,
    mirrorEntitlement: async () => false,
    purchasePackage: async () => "cancelled",
    refreshEntitlement: async () => false,
    restorePurchases: async () => false,
};

const RevenueCatContext = createContext<RevenueCatValue>(NOT_CONFIGURED);

export function useRevenueCat(): RevenueCatValue {
    return use(RevenueCatContext);
}

async function purchaseOutcome(pack: PurchasesPackage): Promise<PurchaseOutcome> {
    try {
        return (await purchaseAndCheckPro(pack)) ? "pro" : "unentitled";
    } catch (error) {
        if (purchaseCancelled.safeParse(error).success) {
            return (await refreshProEntitlement()) ? "pro" : "cancelled";
        }
        throw error;
    }
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
    const { accountId, profile } = useAuthSession();
    const email = profile?.email;
    const name = profile?.name;
    const [isConfigured] = useState(configureRevenueCat);
    const [isPro, setIsPro] = useState(false);
    const [isResolved, setIsResolved] = useState(false);
    const [isMirrored, setIsMirrored] = useState(false);
    // Starts closed: the identity sync is requested on mount, so a waiter must not see a gap first.
    const [identityPending, setIdentityPending] = useState(() => isConfigured);
    const [mirrorPending, setMirrorPending] = useState(false);
    // Answered at all, success or refusal. Apart from `isMirrored` so the gap between the store's yes and the mirror
    // request still counts as pending, while a refusal leaves nothing waiting forever.
    const [mirrorAnswered, setMirrorAnswered] = useState(false);
    const identityQueue = useRef(Promise.resolve());
    const identityTicket = useRef(0);
    const appliedIdentity = useRef<string | null | undefined>(undefined);
    const requestedIdentity = useRef<string | null | undefined>(undefined);
    const pendingRequest = useRef<{ target: string | null; ticket: number } | null>(null);
    const mirroredFor = useRef<string | null>(null);
    const mirrorTicket = useRef(0);
    const mirrorInFlight = useRef<{ account: string | null; promise: Promise<boolean> } | null>(null);

    // Every entitlement write goes through here: losing Pro invalidates the server mirror, and a mirror still in
    // flight must not land its answer afterwards.
    const applyPro = useCallback((pro: boolean) => {
        setIsPro(pro);
        if (!pro) {
            mirroredFor.current = null;
            mirrorInFlight.current = null;
            mirrorTicket.current += 1;
            setIsMirrored(false);
            // Dropping the in-flight entry orphans its cleanup, so its flags are released here or `isPending`
            // never clears.
            setMirrorPending(false);
            setMirrorAnswered(false);
        }
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            return;
        }
        return onCustomerInfoUpdated((customerInfo) => {
            if (pendingRequest.current === null && appliedIdentity.current === requestedIdentity.current) {
                applyPro(hasProEntitlement(customerInfo));
            }
        });
    }, [applyPro, isConfigured]);

    const syncIdentity = useCallback(
        (target: string | null) => {
            if (pendingRequest.current?.target === target) {
                return;
            }
            if (target !== appliedIdentity.current) {
                applyPro(false);
                setIsResolved(false);
            }
            requestedIdentity.current = target;
            identityTicket.current += 1;
            const ticket = identityTicket.current;
            pendingRequest.current = { target, ticket };
            setIdentityPending(true);
            identityQueue.current = identityQueue.current
                .then(() => (target === null ? logOutUser() : identifyUser(target)))
                .then((pro) => {
                    appliedIdentity.current = target;
                    if (ticket === identityTicket.current) {
                        applyPro(pro);
                        setIsResolved(true);
                    }
                })
                .catch((error) => {
                    console.warn("[revenuecat] identity sync failed", error);
                })
                .finally(() => {
                    if (pendingRequest.current?.ticket === ticket) {
                        pendingRequest.current = null;
                        setIdentityPending(false);
                    }
                });
        },
        [applyPro]
    );

    useEffect(() => {
        if (!isConfigured) {
            return;
        }
        syncIdentity(accountId);
    }, [accountId, isConfigured, syncIdentity]);

    useEffect(() => {
        if (!isResolved || email === undefined || name === undefined || appliedIdentity.current !== accountId) {
            return;
        }
        identityQueue.current = identityQueue.current
            .then(() => setCustomerProfile({ email, name }))
            .catch((error) => {
                console.warn("[revenuecat] profile sync failed", error);
            });
    }, [accountId, email, isResolved, name]);

    const runForSession = useCallback(
        <T,>(op: () => Promise<T>, fallback: T, apply?: (result: T) => void): Promise<T> => {
            if (!isConfigured) {
                return Promise.resolve(fallback);
            }
            if (appliedIdentity.current !== accountId || requestedIdentity.current !== accountId) {
                syncIdentity(accountId);
            }
            const ticket = identityTicket.current;
            const run = identityQueue.current.then(() => {
                if (ticket !== identityTicket.current || appliedIdentity.current !== accountId) {
                    throw new Error("RevenueCat identity does not match the signed-in account");
                }
                return op();
            });
            identityQueue.current = run.then(
                () => undefined,
                () => undefined
            );
            return run.then((result) => {
                if (ticket !== identityTicket.current) {
                    throw new Error("RevenueCat identity changed while the call was running");
                }
                apply?.(result);
                return result;
            });
        },
        [accountId, isConfigured, syncIdentity]
    );

    const refreshEntitlement = useCallback(
        () => runForSession(refreshProEntitlement, false, applyPro),
        [applyPro, runForSession]
    );

    // The server reads its own mirror, not the store. The effect below covers a customer who owned Pro before the
    // mirror shipped, and any purchase whose webhook was missed.
    const mirror = useCallback(async (): Promise<boolean> => {
        // Checkout and the effect overlap, so one request answers both, or a transient failure on the second would
        // overwrite the first's success. Keyed by account: a previous customer's request answers nothing for this one.
        const inFlight = mirrorInFlight.current;
        if (inFlight !== null && inFlight.account === accountId) {
            return await inFlight.promise;
        }
        const ticket = mirrorTicket.current;
        const run = mirrorEntitlement().then((mirrored) => {
            // The entitlement was lost meanwhile, so this answer describes a customer no longer being gated.
            if (ticket !== mirrorTicket.current) {
                return false;
            }
            // Recorded only on success, so a refusal (`false`) is retried rather than remembered.
            mirroredFor.current = mirrored ? accountId : null;
            setIsMirrored(mirrored);
            return mirrored;
        });
        mirrorInFlight.current = { account: accountId, promise: run };
        setMirrorPending(true);
        run.catch(() => undefined).finally(() => {
            if (mirrorInFlight.current?.promise === run) {
                mirrorInFlight.current = null;
                setMirrorPending(false);
                setMirrorAnswered(true);
            }
        });
        return await run;
    }, [accountId]);

    const mirrorOnce = useCallback(() => {
        if (!isConfigured || !isPro || accountId === null || mirroredFor.current === accountId) {
            return;
        }
        mirror().catch((error) => {
            console.warn("[revenuecat] entitlement mirror failed", error);
        });
    }, [accountId, isConfigured, isPro, mirror]);

    useEffect(mirrorOnce, [mirrorOnce]);

    useEffect(() => {
        if (!isConfigured) {
            return;
        }
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                refreshEntitlement()
                    // A refused mirror retries here: the entitlement does not change, so nothing else asks again.
                    .then(mirrorOnce)
                    .catch((error) => {
                        console.warn("[revenuecat] foreground entitlement read failed", error);
                    });
            }
        });
        return () => {
            subscription.remove();
        };
    }, [isConfigured, mirrorOnce, refreshEntitlement]);

    const getPackages = useCallback(() => runForSession(getRevenueCatPackages, []), [runForSession]);

    const trialEligible = useCallback(
        (productIds: readonly string[]) => runForSession(() => eligibleForTrial(productIds), new Set<string>()),
        [runForSession]
    );

    const purchasePackage = useCallback(
        (pack: PurchasesPackage) =>
            runForSession<PurchaseOutcome>(
                () => purchaseOutcome(pack),
                "cancelled",
                (outcome) => applyPro(outcome === "pro")
            ),
        [applyPro, runForSession]
    );

    const restorePurchases = useCallback(
        () => runForSession(restoreAndCheckPro, false, applyPro),
        [applyPro, runForSession]
    );

    const value = useMemo<RevenueCatValue>(
        () => ({
            eligibleForTrial: trialEligible,
            getPackages,
            isConfigured,
            isMirrored,
            // `isPro && !mirrorAnswered` covers the render before the mirror request starts, or a gate reads the gap as
            // "not entitled".
            isPending: identityPending || mirrorPending || (isPro && !mirrorAnswered),
            isPro,
            isResolved,
            mirrorEntitlement: mirror,
            purchasePackage,
            refreshEntitlement,
            restorePurchases,
        }),
        [
            getPackages,
            identityPending,
            isConfigured,
            isMirrored,
            isPro,
            isResolved,
            mirror,
            mirrorAnswered,
            mirrorPending,
            purchasePackage,
            refreshEntitlement,
            restorePurchases,
            trialEligible,
        ]
    );

    return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

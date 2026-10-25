import { useAtomMount, useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Stream from "effect/Stream";
import { use } from "react";
import type { PurchasesPackage } from "react-native-purchases";

import { useAuthSession } from "@/lib/auth-session";
import { RevenueCat } from "@/lib/revenuecat-service";
import type { Entitlement, PurchaseOutcome as PurchaseOutcomeSchema, Session } from "@/lib/revenuecat-service";
import { appRuntime } from "@/lib/runtime";

export type PurchaseOutcome = typeof PurchaseOutcomeSchema.Type;

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

const NOT_CONFIGURED: Entitlement = {
    isConfigured: false,
    isMirrored: false,
    isPending: false,
    isPro: false,
    isResolved: true,
};

export const entitlementAtom = appRuntime.atom(
    Stream.unwrap(RevenueCat.pipe(Effect.map((revenueCat) => revenueCat.entitlement)))
);

export const revenueCatAtom = appRuntime.atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.run())));

export const revenueCatSessionAtom = Atom.family((session: Session) =>
    appRuntime.atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.follow(session))))
);

function runRevenueCat<A, E>(
    registry: AtomRegistry.AtomRegistry,
    operation: (revenueCat: RevenueCat["Service"]) => Effect.Effect<A, E>
): Promise<A> {
    return Effect.runPromise(
        AtomRegistry.getResult(registry, appRuntime).pipe(
            Effect.flatMap((services) =>
                operation(Context.get(services, RevenueCat)).pipe(Effect.provideContext(services))
            )
        )
    );
}

export function RevenueCatSession() {
    const { accountId, profile } = useAuthSession();
    const run = useAtomValue(revenueCatAtom);
    useAtomMount(revenueCatSessionAtom({ accountId, email: profile?.email, name: profile?.name }));
    if (AsyncResult.isFailure(run)) {
        throw Cause.squash(run.cause);
    }
    return null;
}

export function useRevenueCat(): RevenueCatValue {
    const registry = use(RegistryContext);
    const { accountId } = useAuthSession();
    const result = useAtomValue(entitlementAtom);
    const entitlement = AsyncResult.isSuccess(result) ? result.value : NOT_CONFIGURED;
    const eligibleForTrial = (productIds: readonly string[]) =>
        runRevenueCat(registry, (revenueCat) => revenueCat.eligibleForTrial(accountId, productIds));
    const getPackages = () => runRevenueCat(registry, (revenueCat) => revenueCat.getPackages(accountId));
    const mirrorEntitlement = () => runRevenueCat(registry, (revenueCat) => revenueCat.mirror(accountId));
    const purchasePackage = (pack: PurchasesPackage) =>
        runRevenueCat(registry, (revenueCat) => revenueCat.purchase(accountId, pack));
    const refreshEntitlement = () => runRevenueCat(registry, (revenueCat) => revenueCat.refresh(accountId));
    const restorePurchases = () => runRevenueCat(registry, (revenueCat) => revenueCat.restore(accountId));
    return {
        ...entitlement,
        eligibleForTrial,
        getPackages,
        mirrorEntitlement,
        purchasePackage,
        refreshEntitlement,
        restorePurchases,
    };
}

import { useAtomMount, useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";
import { use } from "react";
import type { PurchasesPackage } from "react-native-purchases";

import { useAuthSession } from "@/lib/auth-session";
import { RevenueCat } from "@/lib/revenuecat-service";
import type { Entitlement, PurchaseOutcome as PurchaseOutcomeSchema, Session } from "@/lib/revenuecat-service";
import { appRuntime } from "@/lib/runtime";
import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "@/state/atom-command";
import type { AtomCommand } from "@/state/atom-command";

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

export const entitlementAtom = appRuntime
    .atom(Stream.unwrap(RevenueCat.pipe(Effect.map((revenueCat) => revenueCat.entitlement))))
    .pipe(Atom.withLabel("revenuecat:entitlement"));

export const revenueCatAtom = appRuntime
    .atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.run())))
    .pipe(Atom.withLabel("revenuecat:run"));

export const revenueCatSessionAtom = Atom.family((session: Session) =>
    appRuntime
        .atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.follow(session))))
        .pipe(Atom.withLabel("revenuecat:session"))
);

const revenueCatCommand = <W, A, E>(
    label: string,
    execute: (revenueCat: RevenueCat["Service"], input: W) => Effect.Effect<A, E>
) =>
    createRuntimeCommand(appRuntime, {
        execute: (input: W) => RevenueCat.pipe(Effect.flatMap((revenueCat) => execute(revenueCat, input))),
        label: `revenuecat:${label}`,
    });

const eligibleForTrialCommand = revenueCatCommand(
    "eligible-for-trial",
    (revenueCat, input: { accountId: string | null; productIds: readonly string[] }) =>
        revenueCat.eligibleForTrial(input.accountId, input.productIds)
);

const getPackagesCommand = revenueCatCommand("get-packages", (revenueCat, accountId: string | null) =>
    revenueCat.getPackages(accountId)
);

const mirrorCommand = revenueCatCommand("mirror", (revenueCat, accountId: string | null) =>
    revenueCat.mirror(accountId)
);

const purchaseCommand = revenueCatCommand(
    "purchase",
    (revenueCat, input: { accountId: string | null; pack: PurchasesPackage }) =>
        revenueCat.purchase(input.accountId, input.pack)
);

const refreshCommand = revenueCatCommand("refresh", (revenueCat, accountId: string | null) =>
    revenueCat.refresh(accountId)
);

const restoreCommand = revenueCatCommand("restore", (revenueCat, accountId: string | null) =>
    revenueCat.restore(accountId)
);

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
    const run = async <W, A>(command: AtomCommand<W, A, unknown>, input: W) =>
        unwrapAtomCommand(await runAtomCommand(registry, command, input, SILENT));
    const eligibleForTrial = (productIds: readonly string[]) => run(eligibleForTrialCommand, { accountId, productIds });
    const getPackages = () => run(getPackagesCommand, accountId);
    const mirrorEntitlement = () => run(mirrorCommand, accountId);
    const purchasePackage = (pack: PurchasesPackage) => run(purchaseCommand, { accountId, pack });
    const refreshEntitlement = () => run(refreshCommand, accountId);
    const restorePurchases = () => run(restoreCommand, accountId);
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

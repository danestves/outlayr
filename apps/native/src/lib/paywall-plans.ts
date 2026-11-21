import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { readExitOffer, readPlans } from "@/domain/pro-plans";
import type { Plan } from "@/domain/pro-plans";
import { RevenueCat } from "@/lib/revenuecat-service";
import { appRuntime } from "@/lib/runtime";

const loadPlans = Effect.fn("Paywall.loadPlans")(function* loadPlans(accountId: string | null) {
    const revenueCat = yield* RevenueCat;
    const packages = yield* revenueCat.getPackages(accountId);
    const eligible = yield* revenueCat
        .eligibleForTrial(
            accountId,
            packages.map((offer) => offer.product.identifier)
        )
        .pipe(Effect.orElseSucceed(() => new Set<string>()));
    return readPlans(packages, eligible);
});

// A second annual product in the same subscription group: Apple only sells a new customer a discount as an intro offer.
const EXIT_OFFERING = "exit";

const loadExitOffer = Effect.fn("Paywall.loadExitOffer")(function* loadExitOffer(accountId: string | null) {
    const revenueCat = yield* RevenueCat;
    const packages = yield* revenueCat.getPackages(accountId, EXIT_OFFERING);
    const eligible = yield* revenueCat
        .eligibleForTrial(
            accountId,
            packages.map((offer) => offer.product.identifier)
        )
        .pipe(Effect.orElseSucceed(() => new Set<string>()));
    return readExitOffer(packages, eligible);
});

export const exitOfferAtom = Atom.family((accountId: string | null) =>
    appRuntime
        .atom(loadExitOffer(accountId).pipe(Effect.orElseSucceed(() => null)))
        .pipe(Atom.withLabel("paywall:exit-offer"))
);

export const paywallPlansAtom = Atom.family((key: { readonly accountId: string | null; readonly attempt: number }) =>
    appRuntime.atom(loadPlans(key.accountId)).pipe(Atom.withLabel("paywall:plans"))
);

export const heldPlansAtom = Atom.family((key: { readonly accountId: string | null; readonly held: boolean }) =>
    appRuntime
        .atom(key.held ? loadPlans(key.accountId) : Effect.succeed<Plan[]>([]))
        .pipe(Atom.withLabel("paywall:held-plans"))
);

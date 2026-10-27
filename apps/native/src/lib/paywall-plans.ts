import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { readPlans } from "@/domain/pro-plans";
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

export const paywallPlansAtom = Atom.family((key: { readonly accountId: string | null; readonly attempt: number }) =>
    appRuntime.atom(loadPlans(key.accountId)).pipe(Atom.withLabel("paywall:plans"))
);

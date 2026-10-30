import { useAtomMount, useAtomValue } from "@effect/atom-react/Hooks";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { useAuthSession } from "@/lib/auth-session";
import { RevenueCat } from "@/lib/revenuecat-service";
import type { Entitlement, Session } from "@/lib/revenuecat-service";
import { appRuntime } from "@/lib/runtime";

const entitlementStreamAtom = appRuntime
    .atom(Stream.unwrap(RevenueCat.pipe(Effect.map((revenueCat) => revenueCat.entitlement))))
    .pipe(Atom.withLabel("revenuecat:entitlement-stream"));

export const entitlementAtom = entitlementStreamAtom.pipe(
    Atom.map((result): Entitlement =>
        AsyncResult.isSuccess(result) ? result.value : { kind: "unresolved", pending: AsyncResult.isInitial(result) }
    ),
    Atom.withLabel("revenuecat:entitlement")
);

export const revenueCatAtom = appRuntime
    .atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.run())))
    .pipe(Atom.withLabel("revenuecat:run"));

export const revenueCatSessionAtom = Atom.family((session: Session) =>
    appRuntime
        .atom(RevenueCat.pipe(Effect.flatMap((revenueCat) => revenueCat.follow(session))))
        .pipe(Atom.withLabel("revenuecat:session"))
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

export function useRevenueCat(): Entitlement {
    return useAtomValue(entitlementAtom);
}

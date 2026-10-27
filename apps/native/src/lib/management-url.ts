import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { managementUrl, onCustomerInfoUpdated } from "@/lib/revenuecat";

const NO_URL: Effect.Effect<string | null> = Effect.succeed(null);

export const managementUrlAtom = Atom.family((configured: boolean) =>
    Atom.make((get) => {
        if (!configured) {
            return NO_URL;
        }
        get.addFinalizer(
            onCustomerInfoUpdated(() => {
                get.refreshSelf();
            })
        );
        return managementUrl().pipe(Effect.orElseSucceed((): string | null => null));
    }).pipe(Atom.withLabel("revenuecat:management-url"))
);

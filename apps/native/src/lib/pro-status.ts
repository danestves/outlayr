import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import type { ProStatus } from "@/domain/pro-status";
import { onCustomerInfoUpdated, proTerm } from "@/lib/revenuecat";

interface ProTermView {
    readonly manageUrl: string | null;
    readonly status: ProStatus | null;
}

const UNKNOWN: ProTermView = { manageUrl: null, status: null };

export const proTermAtom = Atom.family((configured: boolean) =>
    Atom.make((get) => {
        if (!configured) {
            return Effect.succeed(UNKNOWN);
        }
        get.addFinalizer(
            onCustomerInfoUpdated(() => {
                get.refreshSelf();
            })
        );
        return proTerm().pipe(Effect.orElseSucceed(() => UNKNOWN));
    }).pipe(Atom.withLabel("revenuecat:pro-term"))
);

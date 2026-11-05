import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import type { ProStatus } from "@/domain/pro-status";
import { onCustomerInfoUpdated, proTerm } from "@/lib/revenuecat";

interface ProTermView {
    readonly manageUrl: string | null;
    readonly productId: string | null;
    readonly status: ProStatus | null;
}

export const UNKNOWN_PRO_TERM: ProTermView = { manageUrl: null, productId: null, status: null };

export const proTermAtom = Atom.family((configured: boolean) =>
    Atom.make((get) => {
        if (!configured) {
            return Effect.succeed(UNKNOWN_PRO_TERM);
        }
        get.addFinalizer(
            onCustomerInfoUpdated(() => {
                get.refreshSelf();
            })
        );
        return proTerm().pipe(Effect.orElseSucceed(() => UNKNOWN_PRO_TERM));
    }).pipe(Atom.withLabel("revenuecat:pro-term"))
);

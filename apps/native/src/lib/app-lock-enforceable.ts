import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { lockIsEnforceable } from "@/lib/app-lock";

const NOT_CHECKED: Effect.Effect<boolean | null> = Effect.succeed(null);

export const lockEnforceableAtom = Atom.family((enabled: boolean) =>
    Atom.make(enabled ? lockIsEnforceable() : NOT_CHECKED).pipe(Atom.withLabel("app-lock:enforceable"))
);

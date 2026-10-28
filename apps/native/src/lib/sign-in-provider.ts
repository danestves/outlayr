import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { providerBindingFor } from "./provider-revocation";
import type { ProviderBinding } from "./provider-revocation";
import { appRuntime } from "./runtime";

const NO_PROVIDER: Effect.Effect<ProviderBinding["provider"] | null> = Effect.succeed(null);

export const signInProviderAtom = Atom.family((userId: string | null) =>
    appRuntime
        .atom(
            userId === null
                ? NO_PROVIDER
                : providerBindingFor(userId).pipe(
                      Effect.map((binding) => binding.provider),
                      Effect.orElseSucceed((): ProviderBinding["provider"] | null => null)
                  )
        )
        .pipe(Atom.withLabel("account:sign-in-provider"))
);

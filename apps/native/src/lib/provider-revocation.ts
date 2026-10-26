import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { SecureStorage } from "./secure-storage";

export const PROVIDER_BINDING_KEY = "outlayr.provider-binding";

const ProviderBinding = Schema.Struct({
    betterAuthUserId: Schema.NonEmptyString,
    provider: Schema.Literals(["apple", "google", "password"]),
    providerSubject: Schema.NonEmptyString,
});

export type ProviderBinding = typeof ProviderBinding.Type;

const MESSAGES = {
    invalid: "Provider binding is invalid",
    mismatch: "Provider binding does not match this account",
    reauthenticate: "Provider revocation requires reauthentication",
    revoke: "Provider revocation failed",
} as const;

export class ProviderRevocationError extends Schema.TaggedError<ProviderRevocationError>()("ProviderRevocationError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["invalid", "mismatch", "reauthenticate", "revoke"]),
}) {
    override get message(): string {
        return MESSAGES[this.reason];
    }
}

const isProviderBinding = Schema.is(ProviderBinding);
const decodeProviderBinding = Schema.decodeUnknownOption(Schema.fromJsonString(ProviderBinding));

/** Call only once the matching Better Auth session is established. */
export const persistProviderBinding = Effect.fn("ProviderRevocation.persistBinding")(function* persistBinding(
    binding: ProviderBinding
) {
    if (!isProviderBinding(binding)) {
        return yield* new ProviderRevocationError({ reason: "invalid" });
    }
    const storage = yield* SecureStorage;
    yield* storage.set(PROVIDER_BINDING_KEY, JSON.stringify(binding));
});

export const providerBindingFor = Effect.fn("ProviderRevocation.bindingFor")(function* bindingFor(
    betterAuthUserId: string
) {
    const storage = yield* SecureStorage;
    const raw = yield* storage.get(PROVIDER_BINDING_KEY);
    const parsed = raw === null ? Option.none() : decodeProviderBinding(raw);
    if (Option.isNone(parsed)) {
        return yield* new ProviderRevocationError({ reason: "reauthenticate" });
    }
    if (parsed.value.betterAuthUserId !== betterAuthUserId) {
        return yield* new ProviderRevocationError({ reason: "mismatch" });
    }
    return parsed.value;
});

export const revokeGoogleProviderSubject = Effect.fn("ProviderRevocation.revokeGoogle")(function* revokeGoogle(
    providerSubject: string
) {
    yield* Effect.tryPromise({
        catch: (cause) => new ProviderRevocationError({ cause, reason: "revoke" }),
        try: async () => {
            const { GoogleOneTapSignIn } = await import("react-native-nitro-google-signin");
            await GoogleOneTapSignIn.revokeAccess(providerSubject);
        },
    });
});

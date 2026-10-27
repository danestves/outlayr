import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { readSecureItem, writeSecureItem } from "@/state/secure-storage-commands";

export const PROVIDER_BINDING_KEY = "outlayr.provider-binding";

const ProviderBinding = Schema.Struct({
    betterAuthUserId: Schema.NonEmptyString,
    provider: Schema.Literals(["apple", "google", "password"]),
    providerSubject: Schema.NonEmptyString,
});

export type ProviderBinding = typeof ProviderBinding.Type;

const isProviderBinding = Schema.is(ProviderBinding);
const decodeProviderBinding = Schema.decodeUnknownOption(ProviderBinding);

/** Call only once the matching Better Auth session is established. */
export async function persistProviderBinding(binding: ProviderBinding): Promise<void> {
    if (!isProviderBinding(binding)) {
        throw new Error("Provider binding is invalid");
    }
    await writeSecureItem(PROVIDER_BINDING_KEY, JSON.stringify(binding));
}

export async function providerBindingFor(betterAuthUserId: string): Promise<ProviderBinding> {
    const raw = await readSecureItem(PROVIDER_BINDING_KEY);
    if (raw === null) {
        throw new Error("Provider revocation requires reauthentication");
    }
    let parsed: Option.Option<ProviderBinding>;
    try {
        parsed = decodeProviderBinding(JSON.parse(raw));
    } catch (cause) {
        throw new Error("Provider revocation requires reauthentication", { cause });
    }
    if (Option.isNone(parsed)) {
        throw new Error("Provider revocation requires reauthentication");
    }
    if (parsed.value.betterAuthUserId !== betterAuthUserId) {
        throw new Error("Provider binding does not match this account");
    }
    return parsed.value;
}

export async function revokeGoogleProviderSubject(providerSubject: string): Promise<void> {
    const { GoogleOneTapSignIn } = await import("react-native-nitro-google-signin");
    await GoogleOneTapSignIn.revokeAccess(providerSubject);
}

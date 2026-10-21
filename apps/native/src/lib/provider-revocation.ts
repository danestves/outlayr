import { getItemAsync, setItemAsync } from "expo-secure-store";
import { z } from "zod";

export const PROVIDER_BINDING_KEY = "outlayr.provider-binding";

export interface ProviderBinding {
    betterAuthUserId: string;
    provider: "apple" | "google" | "password";
    providerSubject: string;
}

const providerBinding = z.object({
    betterAuthUserId: z.string().min(1),
    provider: z.enum(["apple", "google", "password"]),
    providerSubject: z.string().min(1),
});

/** Call only once the matching Better Auth session is established. */
export async function persistProviderBinding(binding: ProviderBinding): Promise<void> {
    if (!providerBinding.safeParse(binding).success) {
        throw new Error("Provider binding is invalid");
    }
    await setItemAsync(PROVIDER_BINDING_KEY, JSON.stringify(binding));
}

export async function providerBindingFor(betterAuthUserId: string): Promise<ProviderBinding> {
    const raw = await getItemAsync(PROVIDER_BINDING_KEY);
    if (raw === null) {
        throw new Error("Provider revocation requires reauthentication");
    }
    let parsed: z.ZodSafeParseResult<ProviderBinding>;
    try {
        parsed = providerBinding.safeParse(JSON.parse(raw));
    } catch (cause) {
        throw new Error("Provider revocation requires reauthentication", { cause });
    }
    if (!parsed.success) {
        throw new Error("Provider revocation requires reauthentication");
    }
    if (parsed.data.betterAuthUserId !== betterAuthUserId) {
        throw new Error("Provider binding does not match this account");
    }
    return parsed.data;
}

export async function revokeGoogleProviderSubject(providerSubject: string): Promise<void> {
    const { GoogleOneTapSignIn } = await import("react-native-nitro-google-signin");
    await GoogleOneTapSignIn.revokeAccess(providerSubject);
}

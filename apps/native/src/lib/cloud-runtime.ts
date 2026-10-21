import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { cloudConfiguration, env } from "@outlayr/env/native";
import type { BetterAuthClientPlugin } from "better-auth/client";
import type { emailOTP } from "better-auth/plugins/email-otp";
import { createAuthClient } from "better-auth/react";
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import { AFTER_FIRST_UNLOCK, getItem, setItem } from "expo-secure-store";

const keychain = { keychainAccessible: AFTER_FIRST_UNLOCK };

/** Rebuilt because better-auth only exports `emailOTPClient` from a barrel Metro would ship whole. */
const emailCodes = {
    // SAFETY: a type carrier, as in better-auth's own client plugins.
    $InferServerPlugin: {} as ReturnType<typeof emailOTP>,
    atomListeners: [{ matcher: (path) => path === "/email-otp/verify-email", signal: "$sessionSignal" }],
    id: "email-otp",
} satisfies BetterAuthClientPlugin;

function readKeychain(key: string): string | null {
    try {
        return getItem(key, keychain);
    } catch {
        return null;
    }
}

function createCloudRuntime() {
    if (cloudConfiguration() !== "configured") {
        return null;
    }

    const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;
    const siteUrl = env.EXPO_PUBLIC_CONVEX_SITE_URL;
    if (!(convexUrl && siteUrl)) {
        return null;
    }

    const configuredScheme = Constants.expoConfig?.scheme;
    const scheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme;
    if (!scheme) {
        return null;
    }

    return {
        authClient: createAuthClient({
            baseURL: siteUrl,
            // Every app switch would otherwise fetch the session; launch restores it, token refresh catches a revoke.
            sessionOptions: { refetchOnWindowFocus: false },
            plugins: [
                convexClient(),
                emailCodes,
                expoClient({
                    scheme,
                    storage: {
                        getItem: readKeychain,
                        setItem: (key, value) => setItem(key, value, keychain),
                    },
                    storagePrefix: scheme,
                }),
            ],
        }),
        convex: new ConvexReactClient(convexUrl, {
            unsavedChangesWarning: false,
        }),
    };
}

export type CloudRuntime = NonNullable<ReturnType<typeof createCloudRuntime>>;

export const cloudRuntime: CloudRuntime | null = createCloudRuntime();

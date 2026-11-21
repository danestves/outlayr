import { expoClient, getCookie, storageAdapter } from "@better-auth/expo/client";
import type { ExpoClientStorage } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthClientPlugin } from "better-auth/client";
import type { anonymous } from "better-auth/plugins/anonymous";
import type { emailOTP } from "better-auth/plugins/email-otp";
import { createAuthClient } from "better-auth/react";
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import { AFTER_FIRST_UNLOCK, getItem, getItemAsync, setItem, setItemAsync } from "expo-secure-store";

import { runtimeLanguage } from "@/i18n/runtime";

import { CONVEX_SITE_URL, CONVEX_URL, cloudConfiguration } from "./cloud-configuration";
import { retryTokenFetch } from "./token-fetch";

const keychain = { keychainAccessible: AFTER_FIRST_UNLOCK };

/** Rebuilt because better-auth only exports `emailOTPClient` from a barrel Metro would ship whole. */
const emailCodes = {
    // SAFETY: a type carrier, as in better-auth's own client plugins.
    $InferServerPlugin: {} as ReturnType<typeof emailOTP>,
    atomListeners: [{ matcher: (path) => path === "/email-otp/verify-email", signal: "$sessionSignal" }],
    id: "email-otp",
} satisfies BetterAuthClientPlugin;

const guests = {
    // SAFETY: a type carrier, as above.
    $InferServerPlugin: {} as ReturnType<typeof anonymous>,
    atomListeners: [{ matcher: (path) => path === "/sign-in/anonymous", signal: "$sessionSignal" }],
    id: "anonymous",
    pathMethods: { "/sign-in/anonymous": "POST" },
} satisfies BetterAuthClientPlugin;

const keychainStorage = {
    getItem: (key) => {
        try {
            return getItem(key, keychain);
        } catch {
            return null;
        }
    },
    getItemAsync: (key) => getItemAsync(key, keychain).catch(() => null),
    setItem: (key, value) => setItem(key, value, keychain),
    setItemAsync: (key, value) => setItemAsync(key, value, keychain),
} satisfies ExpoClientStorage;

function createCloudRuntime() {
    if (cloudConfiguration() !== "configured") {
        return null;
    }

    const convexUrl = CONVEX_URL;
    const siteUrl = CONVEX_SITE_URL;
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
            fetchOptions: {
                customFetchImpl: retryTokenFetch(fetch),
                onRequest: (context) => {
                    context.headers.set("accept-language", runtimeLanguage());
                    return context;
                },
            },
            // Every app switch would otherwise fetch the session; launch restores it, token refresh catches a revoke.
            sessionOptions: { refetchOnWindowFocus: false },
            plugins: [
                convexClient(),
                emailCodes,
                guests,
                expoClient({
                    scheme,
                    storage: keychainStorage,
                    storagePrefix: scheme,
                }),
            ],
        }),
        // The launch gate decides during render, before the async getCookie() could resolve.
        storedCookie: () => getCookie(storageAdapter(keychainStorage).getItem(`${scheme}_cookie`)),
        convex: new ConvexReactClient(convexUrl, {
            unsavedChangesWarning: false,
        }),
    };
}

export type CloudRuntime = NonNullable<ReturnType<typeof createCloudRuntime>>;

export const cloudRuntime: CloudRuntime | null = createCloudRuntime();

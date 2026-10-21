import { useState } from "react";
import { z } from "zod";

import { isSignInCancellation, signInFailureDetail, signInFailureMessage } from "@/domain/account";
import { useTranslation } from "@/i18n/context";
import type { AppleSignInCredential } from "@/lib/apple-sign-in";
import type { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { persistProviderBinding } from "@/lib/provider-revocation";

type AuthClient = NonNullable<typeof authClient>;

export type SignInProvider = "apple" | "google";

/** Null is a dismissed sheet, which is not a failure. */
type SignInRequest =
    | { getCredential: () => Promise<AppleSignInCredential | null>; provider: "apple" }
    | { getCredential: () => Promise<string | null>; provider: "google" };

export interface ProviderSignIn {
    busy: SignInProvider | null;
    error: string | null;
    start: (request: SignInRequest) => void;
}

type Activation = Pick<ReturnType<typeof useAuthSession>, "activate" | "begin" | "reject">;
interface ProviderSignInOptions {
    onAppleFailure?: () => Promise<void>;
}

interface SocialSignInResult {
    data?: { user?: { id?: unknown } } | null;
    error?: { message?: string } | null;
}

const userIdSchema = z.string().min(1);

function betterAuthUserId(result: SocialSignInResult): string {
    const userId = userIdSchema.safeParse(result.data?.user?.id);
    if (!userId.success) {
        throw new Error("Provider sign-in did not return a Better Auth user");
    }
    return userId.data;
}

const identityClaims = z.object({ sub: z.string().min(1) });

const appleGrant = z.object({ active: z.literal(true) });

export function googleProviderSubject(identityToken: string): string {
    const [, payload] = identityToken.split(".");
    if (!payload) {
        throw new Error("Google sign-in did not return a valid identity token");
    }
    try {
        const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const claims = identityClaims.safeParse(JSON.parse(globalThis.atob(padded)));
        if (!claims.success) {
            throw new Error("Google identity token does not contain a subject");
        }
        return claims.data.sub;
    } catch (cause) {
        if (cause instanceof Error && cause.message === "Google identity token does not contain a subject") {
            throw cause;
        }
        throw new Error("Google sign-in did not return a valid identity token", { cause });
    }
}

export async function completeAppleSignIn(
    client: AuthClient,
    activation: Activation,
    credential: AppleSignInCredential,
    onFailure?: () => Promise<void>
): Promise<void> {
    activation.begin();
    try {
        // SAFETY: the client is built without the provider generic better-auth needs here; only `data.user.id`
        // and `error.message` are read, and both are checked before use.
        const result = (await client.signIn.social({
            idToken: { nonce: credential.nonce, token: credential.identityToken },
            provider: "apple",
        })) as SocialSignInResult;
        const { error: rejection } = result;
        if (rejection) {
            throw new Error(rejection.message);
        }
        const userId = betterAuthUserId(result);
        const grantResult = await client.$fetch("/apple/grant", {
            body: credential,
            method: "POST",
        });
        const active = appleGrant.safeParse(grantResult.data).success;
        if (grantResult.error || !active) {
            throw new Error(grantResult.error?.message ?? "Apple credential activation failed");
        }
        await persistProviderBinding({
            betterAuthUserId: userId,
            provider: "apple",
            providerSubject: credential.providerSubject,
        });
        activation.activate();
    } catch (cause) {
        await client.signOut?.();
        activation.reject();
        await onFailure?.();
        throw cause;
    }
}

export async function completeGoogleSignIn(client: AuthClient, identityToken: string): Promise<void> {
    // SAFETY: as in `completeAppleSignIn`.
    const result = (await client.signIn.social({
        idToken: { token: identityToken },
        provider: "google",
    })) as SocialSignInResult;
    if (result.error) {
        throw new Error(result.error.message);
    }
    await persistProviderBinding({
        betterAuthUserId: betterAuthUserId(result),
        provider: "google",
        providerSubject: googleProviderSubject(identityToken),
    });
}

export function useProviderSignIn(client: AuthClient, options: ProviderSignInOptions = {}): ProviderSignIn {
    const t = useTranslation();
    const activation = useAuthSession();
    const [busy, setBusy] = useState<SignInProvider | null>(null);
    const [error, setError] = useState<string | null>(null);

    const start = (request: SignInRequest) => {
        setError(null);
        setBusy(request.provider);
        const completed =
            request.provider === "apple"
                ? request.getCredential().then(async (credential) => {
                      if (credential) {
                          await completeAppleSignIn(client, activation, credential, options.onAppleFailure);
                      }
                  })
                : request.getCredential().then(async (idToken) => {
                      if (idToken) {
                          await completeGoogleSignIn(client, idToken);
                      }
                  });
        completed
            .catch((cause: unknown) => {
                if (!isSignInCancellation(cause)) {
                    console.warn("[outlayr] sign-in failed", signInFailureDetail(cause));
                    setError(signInFailureMessage(cause, t));
                }
            })
            .finally(() => setBusy(null));
    };

    return { busy, error, start };
}

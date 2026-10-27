import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { AppleSignInCredential } from "./apple-sign-in";
import type { authClient } from "./auth-client";
import type { useAuthSession } from "./auth-session";
import { persistProviderBinding } from "./provider-revocation";

type AuthClient = NonNullable<typeof authClient>;

export type SignInProvider = "apple" | "google";

/** Null is a dismissed sheet, which is not a failure. */
export type SignInRequest =
    | { getCredential: () => Effect.Effect<AppleSignInCredential | null, Cause.UnknownError>; provider: "apple" }
    | { getCredential: () => Effect.Effect<string | null, Cause.UnknownError>; provider: "google" };

export type Activation = Pick<ReturnType<typeof useAuthSession>, "activate" | "begin" | "reject">;

interface SocialSignInResult {
    data?: { user?: { id?: unknown } } | null;
    error?: { message?: string } | null;
}

export class ProviderSignInError extends Schema.TaggedError<ProviderSignInError>()("ProviderSignInError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["cleanup", "credential", "grant", "identity", "sign-in"]),
}) {
    override get message(): string {
        return `Provider sign-in failed during ${this.operation}`;
    }
}

const isUserId = Schema.is(Schema.NonEmptyString);

const betterAuthUserId = (result: SocialSignInResult) =>
    Effect.suspend(() => {
        const userId = result.data?.user?.id;
        return isUserId(userId)
            ? Effect.succeed(userId)
            : Effect.fail(
                  new ProviderSignInError({
                      cause: new Error("Provider sign-in did not return a Better Auth user"),
                      operation: "identity",
                  })
              );
    });

const decodeIdentityClaims = Schema.decodeUnknownOption(Schema.Struct({ sub: Schema.NonEmptyString }));

const isAppleGrant = Schema.is(Schema.Struct({ active: Schema.Literal(true) }));

export function googleProviderSubject(identityToken: string): string {
    const [, payload] = identityToken.split(".");
    if (!payload) {
        throw new Error("Google sign-in did not return a valid identity token");
    }
    try {
        const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const claims = decodeIdentityClaims(JSON.parse(globalThis.atob(padded)));
        if (Option.isNone(claims)) {
            throw new Error("Google identity token does not contain a subject");
        }
        return claims.value.sub;
    } catch (cause) {
        if (cause instanceof Error && cause.message === "Google identity token does not contain a subject") {
            throw cause;
        }
        throw new Error("Google sign-in did not return a valid identity token", { cause });
    }
}

const socialSignIn = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({ catch: (cause) => new ProviderSignInError({ cause, operation: "sign-in" }), try: run });

const rejected = (rejection: NonNullable<SocialSignInResult["error"]>) =>
    new ProviderSignInError({ cause: new Error(rejection.message), operation: "sign-in" });

export const completeAppleSignIn = Effect.fn("ProviderSignIn.completeApple")(function* completeApple(
    client: AuthClient,
    activation: Activation,
    credential: AppleSignInCredential,
    onFailure?: () => Effect.Effect<void, unknown>
) {
    activation.begin();
    yield* Effect.gen(function* signIn() {
        // SAFETY: the client is built without the provider generic better-auth needs here; only `data.user.id`
        // and `error.message` are read, and both are checked before use.
        const result = (yield* socialSignIn(() =>
            client.signIn.social({
                idToken: { nonce: credential.nonce, token: credential.identityToken },
                provider: "apple",
            })
        )) as SocialSignInResult;
        if (result.error) {
            return yield* rejected(result.error);
        }
        const userId = yield* betterAuthUserId(result);
        const grantResult = yield* Effect.tryPromise({
            catch: (cause) => new ProviderSignInError({ cause, operation: "grant" }),
            try: () => client.$fetch("/apple/grant", { body: credential, method: "POST" }),
        });
        if (grantResult.error || !isAppleGrant(grantResult.data)) {
            return yield* new ProviderSignInError({
                cause: new Error(grantResult.error?.message ?? "Apple credential activation failed"),
                operation: "grant",
            });
        }
        yield* persistProviderBinding({
            betterAuthUserId: userId,
            provider: "apple",
            providerSubject: credential.providerSubject,
        });
        activation.activate();
    }).pipe(
        Effect.tapError(() =>
            Effect.gen(function* cleanup() {
                if (client.signOut) {
                    yield* Effect.tryPromise({
                        catch: (cause) => new ProviderSignInError({ cause, operation: "cleanup" }),
                        try: () => client.signOut(),
                    });
                }
                activation.reject();
                if (onFailure) {
                    yield* Effect.suspend(onFailure).pipe(
                        Effect.mapError((cause) => new ProviderSignInError({ cause, operation: "cleanup" }))
                    );
                }
            })
        )
    );
});

export const completeGoogleSignIn = Effect.fn("ProviderSignIn.completeGoogle")(function* completeGoogle(
    client: AuthClient,
    identityToken: string
) {
    // SAFETY: as in `completeAppleSignIn`.
    const result = (yield* socialSignIn(() =>
        client.signIn.social({ idToken: { token: identityToken }, provider: "google" })
    )) as SocialSignInResult;
    if (result.error) {
        return yield* rejected(result.error);
    }
    const userId = yield* betterAuthUserId(result);
    const providerSubject = yield* Effect.try({
        catch: (cause) => new ProviderSignInError({ cause, operation: "identity" }),
        try: () => googleProviderSubject(identityToken),
    });
    yield* persistProviderBinding({ betterAuthUserId: userId, provider: "google", providerSubject });
});

export const signInWithProvider = Effect.fn("ProviderSignIn.start")(function* signInWithProvider(input: {
    activation: Activation;
    client: AuthClient;
    onAppleFailure?: () => Effect.Effect<void, unknown>;
    request: SignInRequest;
}) {
    const { activation, client, onAppleFailure, request } = input;
    if (request.provider === "apple") {
        const credential = yield* request
            .getCredential()
            .pipe(Effect.mapError((error) => new ProviderSignInError({ cause: error.cause, operation: "credential" })));
        if (credential) {
            yield* completeAppleSignIn(client, activation, credential, onAppleFailure);
        }
        return;
    }
    const idToken = yield* request
        .getCredential()
        .pipe(Effect.mapError((error) => new ProviderSignInError({ cause: error.cause, operation: "credential" })));
    if (idToken) {
        yield* completeGoogleSignIn(client, idToken);
    }
});

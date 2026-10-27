import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { decryptOAuthToken, setTokenUtil } from "better-auth/oauth2";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { outboundHttp } from "./http";
import { runEdge } from "./runEdge";
import { sha256Hex } from "./sha256Hex";

const AppleFailure = Schema.Literals([
    "accountStorageFailed",
    "clientSecretFailed",
    "exchangedSubjectMismatch",
    "exchangeFailed",
    "grantUnconfigured",
    "incompleteTokens",
    "linkedSubjectMismatch",
    "missingSubject",
    "noRefreshToken",
    "nonceMismatch",
    "reauthenticationRequired",
    "resumeFailed",
    "revokeFailed",
    "revokeUnconfigured",
    "submittedSubjectMismatch",
    "verifyFailed",
]);

const APPLE_ERROR_MESSAGES = {
    accountStorageFailed: "Apple account storage failed",
    clientSecretFailed: "Apple client secret could not be signed",
    exchangedSubjectMismatch: "Apple exchanged token subject does not match the linked Apple account",
    exchangeFailed: "Apple token exchange failed",
    grantUnconfigured: "Apple credential lifecycle is not configured",
    incompleteTokens: "Apple token exchange returned incomplete token material",
    linkedSubjectMismatch: "Apple identity subject does not match the linked Apple account",
    missingSubject: "Apple identity token does not contain a subject",
    noRefreshToken: "Apple authorization-code exchange returned no refresh token",
    nonceMismatch: "Apple identity token nonce does not match the raw nonce",
    reauthenticationRequired: "Apple provider revocation requires reauthentication",
    resumeFailed: "Apple credential revocation could not resolve its deletion job",
    revokeFailed: "Apple token cleanup failed",
    revokeUnconfigured: "Apple account deletion is not configured",
    submittedSubjectMismatch: "Apple identity subject does not match the submitted provider subject",
    verifyFailed: "Apple identity token could not be verified",
} satisfies Record<typeof AppleFailure.Type, string>;

export class AppleLifecycleError extends Schema.TaggedError<AppleLifecycleError>()("AppleLifecycleError", {
    cause: Schema.optional(Schema.Defect()),
    reason: AppleFailure,
}) {
    override get message(): string {
        return APPLE_ERROR_MESSAGES[this.reason];
    }
}

export interface AppleGrantInput {
    authorizationCode: string;
    identityToken: string;
    nonce: string;
    providerSubject: string;
}

interface AppleTokens {
    accessToken: string;
    expiresIn: number;
    idToken: string;
    refreshToken?: string;
}

interface AppleStoredTokens extends Pick<AppleTokens, "accessToken" | "refreshToken"> {
    accessTokenExpiresAt: Date;
}

interface AppleAccount {
    accessToken?: string | null;
    accessTokenExpiresAt?: Date | string | null;
    accountId: string;
    id: string;
    refreshToken?: string | null;
    updatedAt?: Date | string | null;
}

export interface AppleGrantDependencies<E = never, R = never> {
    exchange: (authorizationCode: string) => Effect.Effect<AppleTokens, E, R>;
    findAppleAccount: (userId: string) => Effect.Effect<AppleAccount | null, E, R>;
    persist: (
        accountId: string,
        tokens: AppleStoredTokens,
        retainedRefreshToken?: string | null
    ) => Effect.Effect<void, E, R>;
    revoke: (refreshToken: string) => Effect.Effect<void, E, R>;
    verify: (idToken: string, nonce?: string) => Effect.Effect<{ subject: string }, E, R>;
}

const MS_PER_SECOND = 1000;

export const grantAppleCredential = Effect.fn("AppleLifecycle.grantAppleCredential")(function* grantAppleCredential<
    E,
    R,
>(userId: string, input: AppleGrantInput, deps: AppleGrantDependencies<E, R>) {
    const identity = yield* deps.verify(input.identityToken, input.nonce);
    if (identity.subject !== input.providerSubject) {
        return yield* new AppleLifecycleError({ reason: "submittedSubjectMismatch" });
    }

    const account = yield* deps.findAppleAccount(userId);
    if (!account || account.accountId !== input.providerSubject) {
        return yield* new AppleLifecycleError({ reason: "linkedSubjectMismatch" });
    }

    const tokens = yield* deps.exchange(input.authorizationCode);
    return yield* Effect.gen(function* persistGrant() {
        const exchanged = yield* deps.verify(tokens.idToken);
        if (exchanged.subject !== input.providerSubject) {
            return yield* new AppleLifecycleError({ reason: "exchangedSubjectMismatch" });
        }
        const now = yield* Clock.currentTimeMillis;
        yield* deps.persist(account.id, {
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: new Date(now + tokens.expiresIn * MS_PER_SECOND),
            refreshToken: tokens.refreshToken,
        });
        return { active: true } as const;
    }).pipe(
        Effect.onError(() => (tokens.refreshToken ? deps.revoke(tokens.refreshToken).pipe(Effect.ignore) : Effect.void))
    );
});

const APPLE_TIMEOUT = Duration.seconds(10);
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const decodeAppleIdentityClaims = Schema.decodeUnknownOption(Schema.Struct({ sub: Schema.String }));

export function appleTokenVerifier(clientId: string) {
    return Effect.fn("AppleLifecycle.verify")(function* verify(idToken: string, rawNonce?: string) {
        const { payload } = yield* Effect.tryPromise({
            catch: (cause) => new AppleLifecycleError({ cause, reason: "verifyFailed" }),
            try: () => jwtVerify(idToken, APPLE_JWKS, { audience: clientId, issuer: APPLE_ISSUER }),
        });
        // `jose` types `sub` but the payload is JSON, so the claim is checked rather than trusted.
        const claims = decodeAppleIdentityClaims(payload);
        if (Option.isNone(claims)) {
            return yield* new AppleLifecycleError({ reason: "missingSubject" });
        }
        if (rawNonce && payload.nonce !== (yield* sha256Hex(rawNonce))) {
            return yield* new AppleLifecycleError({ reason: "nonceMismatch" });
        }
        return { subject: claims.value.sub };
    });
}

interface AppleServerConfig {
    clientId: string;
    clientSecret: Effect.Effect<string, AppleLifecycleError>;
}

interface AppleResumeValidator {
    resumeUserId: (resumeSecret: string) => Effect.Effect<string, AppleLifecycleError>;
}

// `setTokenUtil` answers null without encryption configured and a refresh grant returns no refresh token, so both
// token columns carry the absence rather than dropping the write.
interface AppleAccountUpdate {
    accessToken: string | null | undefined;
    accessTokenExpiresAt: Date | undefined;
    refreshToken: string | null | undefined;
}

interface AppleLifecycleContext {
    internalAdapter: {
        findAccounts: (userId: string) => Promise<(AppleAccount & { providerId: string })[]>;
        updateAccount: (accountId: string, values: AppleAccountUpdate) => Promise<unknown>;
    };
}

// `refresh_token` comes only on an authorization-code response, never on a refresh grant.
const decodeAppleTokenResponse = HttpIncomingMessage.schemaBodyJson(
    Schema.Struct({
        access_token: Schema.String,
        expires_in: Schema.Number,
        id_token: Schema.String,
        refresh_token: Schema.optional(Schema.String),
    })
);

const AppleGrantBody = Schema.toStandardSchemaV1(
    Schema.Struct({
        authorizationCode: Schema.NonEmptyString,
        identityToken: Schema.NonEmptyString,
        nonce: Schema.NonEmptyString,
        providerSubject: Schema.NonEmptyString,
    })
);

const AppleRevokeBody = Schema.toStandardSchemaV1(Schema.Struct({ resumeSecret: Schema.NonEmptyString }));

const appleFormRequest = Effect.fn("AppleLifecycle.formRequest")(function* appleFormRequest(
    config: AppleServerConfig,
    path: "revoke" | "token",
    parameters: Record<string, string>,
    failure: "exchangeFailed" | "revokeFailed"
) {
    const failed = (cause: unknown) => new AppleLifecycleError({ cause, reason: failure });
    const clientSecret = yield* config.clientSecret;
    const response = yield* HttpClient.execute(
        HttpClientRequest.post(`https://appleid.apple.com/auth/${path}`).pipe(
            HttpClientRequest.bodyUrlParams({ client_id: config.clientId, client_secret: clientSecret, ...parameters })
        )
    ).pipe(Effect.catchTags({ HttpClientError: failed }));
    if (response.status < 200 || response.status >= 300) {
        return yield* new AppleLifecycleError({ reason: failure });
    }
    return response;
});

const appleTokenRequest = Effect.fn("AppleLifecycle.tokenRequest")(
    function* appleTokenRequest(config: AppleServerConfig, parameters: Record<string, string>) {
        const response = yield* appleFormRequest(config, "token", parameters, "exchangeFailed");
        const tokens = yield* decodeAppleTokenResponse(response).pipe(
            Effect.catchTags({
                HttpClientError: (cause) => new AppleLifecycleError({ cause, reason: "exchangeFailed" }),
                SchemaError: (cause) => new AppleLifecycleError({ cause, reason: "incompleteTokens" }),
            })
        );
        return {
            accessToken: tokens.access_token,
            expiresIn: tokens.expires_in,
            idToken: tokens.id_token,
            refreshToken: tokens.refresh_token,
        } satisfies AppleTokens;
    },
    Effect.timeout(APPLE_TIMEOUT),
    Effect.catchTags({ TimeoutError: (cause) => new AppleLifecycleError({ cause, reason: "exchangeFailed" }) })
);

export function appleCredentialLifecycleDependencies(config: AppleServerConfig, context: AppleLifecycleContext) {
    const storageFailed = (cause: unknown) => new AppleLifecycleError({ cause, reason: "accountStorageFailed" });
    return {
        exchange: Effect.fn("AppleLifecycle.exchange")(function* exchange(authorizationCode: string) {
            const tokens = yield* appleTokenRequest(config, {
                code: authorizationCode,
                grant_type: "authorization_code",
            });
            if (!tokens.refreshToken) {
                return yield* new AppleLifecycleError({ reason: "noRefreshToken" });
            }
            return tokens;
        }),
        findAppleAccount: Effect.fn("AppleLifecycle.findAppleAccount")(function* findAppleAccount(userId: string) {
            const accounts = yield* Effect.tryPromise({
                catch: storageFailed,
                try: () => context.internalAdapter.findAccounts(userId),
            });
            return accounts.find((a: AppleAccount & { providerId: string }) => a.providerId === "apple") ?? null;
        }),
        persist: Effect.fn("AppleLifecycle.persist")(function* persist(
            accountId: string,
            tokens: AppleStoredTokens,
            retainedRefreshToken?: string | null
        ) {
            // SAFETY: better-auth does not export the `AuthContext` its token helpers take; this is the real one.
            const authContext = context as never;
            const accessToken = yield* Effect.tryPromise({
                catch: storageFailed,
                try: () => Promise.resolve(setTokenUtil(tokens.accessToken, authContext)),
            });
            const { refreshToken: replacement } = tokens;
            const refreshToken = replacement
                ? yield* Effect.tryPromise({
                      catch: storageFailed,
                      try: () => Promise.resolve(setTokenUtil(replacement, authContext)),
                  })
                : retainedRefreshToken;
            yield* Effect.tryPromise({
                catch: storageFailed,
                try: () =>
                    context.internalAdapter.updateAccount(accountId, {
                        accessToken,
                        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
                        refreshToken,
                    }),
            });
        }),
        revoke: Effect.fn("AppleLifecycle.revoke")(function* revoke(refreshToken: string) {
            yield* appleFormRequest(
                config,
                "revoke",
                { token: refreshToken, token_type_hint: "refresh_token" },
                "revokeFailed"
            ).pipe(
                Effect.timeout(APPLE_TIMEOUT),
                Effect.catchTags({
                    TimeoutError: (cause) => new AppleLifecycleError({ cause, reason: "revokeFailed" }),
                })
            );
        }),
        verify: appleTokenVerifier(config.clientId),
    } satisfies AppleGrantDependencies<AppleLifecycleError, HttpClient.HttpClient>;
}

export function appleCredentialLifecycle(config: AppleServerConfig | null, resumeValidator: AppleResumeValidator) {
    return {
        endpoints: {
            grantAppleCredential: createAuthEndpoint(
                "/apple/grant",
                {
                    body: AppleGrantBody,
                    method: "POST",
                    use: [sessionMiddleware],
                },
                (ctx) =>
                    runEdge(
                        Effect.gen(function* grantEndpoint() {
                            if (config === null) {
                                return yield* new AppleLifecycleError({ reason: "grantUnconfigured" });
                            }
                            const result = yield* grantAppleCredential(
                                ctx.context.session.user.id,
                                ctx.body,
                                // SAFETY: better-auth always installs `internalAdapter`; this narrows it to the
                                // two calls made.
                                appleCredentialLifecycleDependencies(config, ctx.context as AppleLifecycleContext)
                            );
                            return ctx.json(result);
                        }).pipe(Effect.provide(outboundHttp))
                    )
            ),
            revokeAppleCredential: createAuthEndpoint(
                "/apple/revoke",
                {
                    body: AppleRevokeBody,
                    method: "POST",
                },
                (ctx) =>
                    runEdge(
                        Effect.gen(function* revokeEndpoint() {
                            if (config === null) {
                                return yield* new AppleLifecycleError({ reason: "revokeUnconfigured" });
                            }
                            const dependencies = appleCredentialLifecycleDependencies(
                                config,
                                // SAFETY: as in `grantAppleCredential` above.
                                ctx.context as AppleLifecycleContext
                            );
                            const account = yield* dependencies.findAppleAccount(
                                yield* resumeValidator.resumeUserId(ctx.body.resumeSecret)
                            );
                            const encryptedToken = account?.refreshToken ?? account?.accessToken;
                            if (!(account && encryptedToken)) {
                                return yield* new AppleLifecycleError({ reason: "reauthenticationRequired" });
                            }
                            // SAFETY: the unexported `AuthContext`, as in `persist`.
                            const authContext = ctx.context as never;
                            const refreshToken = yield* Effect.tryPromise({
                                catch: (cause) => new AppleLifecycleError({ cause, reason: "accountStorageFailed" }),
                                try: () => Promise.resolve(decryptOAuthToken(encryptedToken, authContext)),
                            });
                            yield* dependencies.revoke(refreshToken);
                            return ctx.json({ revoked: true });
                        }).pipe(Effect.provide(outboundHttp))
                    )
            ),
        },
        id: "apple-credential-lifecycle",
    };
}

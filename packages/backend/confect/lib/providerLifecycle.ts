import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { decryptOAuthToken, setTokenUtil } from "better-auth/oauth2";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { sha256Hex } from "./sha256Hex";

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

export interface AppleGrantDependencies {
    exchange: (authorizationCode: string) => Promise<AppleTokens>;
    findAppleAccount: (userId: string) => Promise<AppleAccount | null>;
    persist: (accountId: string, tokens: AppleStoredTokens, retainedRefreshToken?: string | null) => Promise<void>;
    revoke: (refreshToken: string) => Promise<void>;
    verify: (idToken: string, nonce?: string) => Promise<{ subject: string }>;
}

function expiresAt(tokens: AppleTokens, now = new Date()): Date {
    return new Date(now.getTime() + tokens.expiresIn * 1000);
}

async function revokeReplacement(tokens: AppleTokens | null, deps: AppleGrantDependencies): Promise<void> {
    if (tokens?.refreshToken) {
        await deps.revoke(tokens.refreshToken).catch(() => undefined);
    }
}

export async function grantAppleCredential(
    userId: string,
    input: AppleGrantInput,
    deps: AppleGrantDependencies
): Promise<{ active: true }> {
    const identity = await deps.verify(input.identityToken, input.nonce);
    if (identity.subject !== input.providerSubject) {
        throw new Error("Apple identity subject does not match the submitted provider subject");
    }

    const account = await deps.findAppleAccount(userId);
    if (!account || account.accountId !== input.providerSubject) {
        throw new Error("Apple identity subject does not match the linked Apple account");
    }

    let tokens: AppleTokens | null = null;
    try {
        tokens = await deps.exchange(input.authorizationCode);
        const exchanged = await deps.verify(tokens.idToken);
        if (exchanged.subject !== input.providerSubject) {
            throw new Error("Apple exchanged token subject does not match the linked Apple account");
        }
        await deps.persist(account.id, {
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: expiresAt(tokens),
            refreshToken: tokens.refreshToken,
        });
        return { active: true };
    } catch (cause) {
        await revokeReplacement(tokens, deps);
        throw cause;
    }
}

const APPLE_TIMEOUT_MS = 10_000;
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const decodeAppleIdentityClaims = Schema.decodeUnknownOption(Schema.Struct({ sub: Schema.String }));

export function appleTokenVerifier(clientId: string): AppleGrantDependencies["verify"] {
    return async (idToken, rawNonce) => {
        const { payload } = await jwtVerify(idToken, APPLE_JWKS, { audience: clientId, issuer: APPLE_ISSUER });
        // `jose` types `sub` but the payload is JSON, so the claim is checked rather than trusted.
        const claims = decodeAppleIdentityClaims(payload);
        if (Option.isNone(claims)) {
            throw new TypeError("Apple identity token does not contain a subject");
        }
        if (rawNonce && payload.nonce !== (await sha256Hex(rawNonce))) {
            throw new Error("Apple identity token nonce does not match the raw nonce");
        }
        return { subject: claims.value.sub };
    };
}

interface AppleServerConfig {
    clientId: string;
    clientSecret: () => Promise<string>;
}

interface AppleResumeValidator {
    resumeUserId: (resumeSecret: string) => Promise<string>;
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
const decodeAppleTokenResponse = Schema.decodeUnknownOption(
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

async function appleTokenRequest(config: AppleServerConfig, parameters: Record<string, string>): Promise<AppleTokens> {
    const response = await fetch("https://appleid.apple.com/auth/token", {
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: await config.clientSecret(),
            ...parameters,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
        signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error("Apple token exchange failed");
    }
    const tokens = decodeAppleTokenResponse(await response.json());
    if (Option.isNone(tokens)) {
        throw new Error("Apple token exchange returned incomplete token material");
    }
    return {
        accessToken: tokens.value.access_token,
        expiresIn: tokens.value.expires_in,
        idToken: tokens.value.id_token,
        refreshToken: tokens.value.refresh_token,
    };
}

function appleCredentialLifecycleDependencies(config: AppleServerConfig, context: AppleLifecycleContext) {
    return {
        exchange: async (authorizationCode: string): Promise<AppleTokens> => {
            const tokens = await appleTokenRequest(config, {
                code: authorizationCode,
                grant_type: "authorization_code",
            });
            if (!tokens.refreshToken) {
                throw new Error("Apple authorization-code exchange returned no refresh token");
            }
            return tokens;
        },
        findAppleAccount: async (userId: string) => {
            const accounts = await context.internalAdapter.findAccounts(userId);
            return accounts.find((a: AppleAccount & { providerId: string }) => a.providerId === "apple") ?? null;
        },
        persist: async (accountId, tokens, retainedRefreshToken) => {
            // SAFETY: better-auth does not export the `AuthContext` its token helpers take; this is the real one.
            await context.internalAdapter.updateAccount(accountId, {
                accessToken: await setTokenUtil(tokens.accessToken, context as never),
                accessTokenExpiresAt: tokens.accessTokenExpiresAt,
                refreshToken: tokens.refreshToken
                    ? await setTokenUtil(tokens.refreshToken, context as never)
                    : retainedRefreshToken,
            });
        },
        revoke: async (refreshToken: string) => {
            const response = await fetch("https://appleid.apple.com/auth/revoke", {
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: await config.clientSecret(),
                    token: refreshToken,
                    token_type_hint: "refresh_token",
                }),
                headers: { "content-type": "application/x-www-form-urlencoded" },
                method: "POST",
                signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
            });
            if (!response.ok) {
                throw new Error("Apple token cleanup failed");
            }
        },
        verify: appleTokenVerifier(config.clientId),
    } satisfies AppleGrantDependencies;
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
                async (ctx) => {
                    if (config === null) {
                        throw new Error("Apple credential lifecycle is not configured");
                    }
                    const result = await grantAppleCredential(
                        ctx.context.session.user.id,
                        ctx.body,
                        // SAFETY: better-auth always installs `internalAdapter`; this narrows it to the two calls made.
                        appleCredentialLifecycleDependencies(config, ctx.context as AppleLifecycleContext)
                    );
                    return ctx.json(result);
                }
            ),
            revokeAppleCredential: createAuthEndpoint(
                "/apple/revoke",
                {
                    body: AppleRevokeBody,
                    method: "POST",
                },
                async (ctx) => {
                    if (config === null) {
                        throw new Error("Apple account deletion is not configured");
                    }
                    const dependencies = appleCredentialLifecycleDependencies(
                        config,
                        // SAFETY: as in `grantAppleCredential` above.
                        ctx.context as AppleLifecycleContext
                    );
                    const account = await dependencies.findAppleAccount(
                        await resumeValidator.resumeUserId(ctx.body.resumeSecret)
                    );
                    const encryptedToken = account?.refreshToken ?? account?.accessToken;
                    if (!(account && encryptedToken)) {
                        throw new Error("Apple provider revocation requires reauthentication");
                    }
                    // SAFETY: the unexported `AuthContext`, as in `persist`.
                    await dependencies.revoke(await decryptOAuthToken(encryptedToken, ctx.context as never));
                    return ctx.json({ revoked: true });
                }
            ),
        },
        id: "apple-credential-lifecycle",
    };
}

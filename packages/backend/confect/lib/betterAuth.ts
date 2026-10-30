import { expo } from "@better-auth/expo";
import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { importPKCS8, SignJWT } from "jose";

import { components, internal } from "../../convex/_generated/api";
import type { DataModel } from "../../convex/_generated/dataModel";
import authConfig from "../../convex/auth.config";
import { authSettings } from "./config";
import { accountExistsEmail, codeEmail, EMAIL_CODE_TTL_SECONDS, emailLanguage, sendEmail } from "./email";
import { outboundHttp } from "./http";
import { AppleLifecycleError, appleCredentialLifecycle } from "./providerLifecycle";
import { runEdge, runEdgeSync } from "./runEdge";
import { sha256Hex } from "./sha256Hex";

function allowedHosts(siteUrl: string, convexSiteUrl: Option.Option<string>) {
    return [...new Set([siteUrl, ...Option.toArray(convexSiteUrl)].map((url) => new URL(url).host))];
}

const LONGEST_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Better Auth limits per IP; these are per address, so one inbox cannot be guessed or flooded from many IPs. */
const EMAIL_LIMITED_PATHS = new Set([
    "/email-otp/request-password-reset",
    "/email-otp/send-verification-otp",
    "/sign-in/email",
    "/sign-up/email",
]);

const emailLimiter = new RateLimiter(components.rateLimiter, {
    emailAuth: { capacity: 10, kind: "token bucket", period: HOUR, rate: 10 },
});

const decodeEmailBody = Schema.decodeUnknownOption(Schema.Struct({ email: Schema.String }));

export const authComponent = createClient<DataModel>(components.betterAuth);

/** Apple's client secret is an ES256 JWT valid six months at most, so it is minted per request. */
const generateAppleClientSecret = Effect.fn("BetterAuth.generateAppleClientSecret")(function* generateAppleClientSecret(
    clientId: string,
    teamId: string,
    keyId: string,
    privateKey: string
) {
    const key = yield* Effect.tryPromise({
        catch: (cause) => new AppleLifecycleError({ cause, reason: "clientSecretFailed" }),
        try: () => importPKCS8(privateKey, "ES256"),
    });
    const now = Math.floor((yield* Clock.currentTimeMillis) / 1000);
    return yield* Effect.tryPromise({
        catch: (cause) => new AppleLifecycleError({ cause, reason: "clientSecretFailed" }),
        try: () =>
            new SignJWT({})
                .setProtectedHeader({ alg: "ES256", kid: keyId })
                .setIssuer(teamId)
                .setSubject(clientId)
                .setAudience("https://appleid.apple.com")
                .setIssuedAt(now)
                .setExpirationTime(now + 180 * 24 * 60 * 60)
                .sign(key),
    });
});

function createAuth(ctx: GenericCtx<DataModel>) {
    const {
        apple: appleConfig,
        convexSiteUrl,
        email: emailConfig,
        google: googleConfig,
        nativeAppUrl,
        siteUrl,
    } = runEdgeSync(authSettings);

    const recordMail = (name: "claimWelcome" | "rememberLanguage", userId: string, headers: Headers | undefined) =>
        runEdge(
            Effect.tryPromise(() =>
                requireRunMutationCtx(ctx).runMutation(internal.mail[name], {
                    language: emailLanguage(headers),
                    userId,
                })
            ).pipe(Effect.ignoreCause({ log: true, message: `mail.${name} failed` }))
        );

    return betterAuth({
        account: { encryptOAuthTokens: true, updateAccountOnSignIn: false },
        advanced: { trustedProxyHeaders: true },
        baseURL: {
            allowedHosts: allowedHosts(siteUrl, convexSiteUrl),
            fallback: siteUrl,
            protocol: new URL(siteUrl).protocol === "http:" ? "http" : "https",
        },
        database: authComponent.adapter(ctx),
        databaseHooks: {
            user: {
                create: {
                    after: async (user, endpoint) => {
                        if (user.emailVerified) {
                            await recordMail("claimWelcome", user.id, endpoint?.request?.headers ?? endpoint?.headers);
                        }
                    },
                },
                update: {
                    after: async (user, endpoint) => {
                        if (user.emailVerified && endpoint?.path === "/email-otp/verify-email") {
                            await recordMail("claimWelcome", user.id, endpoint.request?.headers ?? endpoint.headers);
                        }
                    },
                },
            },
        },
        // The app uses neither: codes only confirm an address or reset a password.
        disabledPaths: ["/forget-password/email-otp", "/send-verification-email", "/sign-in/email-otp"],
        emailAndPassword: {
            enabled: Option.isSome(emailConfig),
            onExistingUserSignUp: ({ user }, request) =>
                runEdge(
                    sendEmail(user.email, accountExistsEmail(emailLanguage(request?.headers))).pipe(
                        Effect.provide(outboundHttp)
                    )
                ),
            requireEmailVerification: true,
            revokeSessionsOnPasswordReset: true,
        },
        emailVerification: {
            autoSignInAfterVerification: true,
            sendOnSignIn: true,
        },
        hooks: {
            after: createAuthMiddleware(async (endpoint) => {
                if (endpoint.path !== "/convex/token") {
                    return;
                }
                const session = await getSessionFromCtx(endpoint);
                if (session) {
                    await recordMail(
                        "rememberLanguage",
                        session.user.id,
                        endpoint.request?.headers ?? endpoint.headers
                    );
                }
            }),
            before: createAuthMiddleware((endpoint) =>
                runEdge(
                    Effect.gen(function* before() {
                        const body = decodeEmailBody(endpoint.body);
                        if (EMAIL_LIMITED_PATHS.has(endpoint.path) && Option.isSome(body)) {
                            const key = yield* sha256Hex(body.value.email.trim().toLowerCase());
                            const { ok } = yield* Effect.promise(() =>
                                emailLimiter.limit(requireRunMutationCtx(ctx), "emailAuth", { key })
                            );
                            if (!ok) {
                                return yield* Effect.fail(
                                    new APIError("TOO_MANY_REQUESTS", { message: "Too many attempts for this email" })
                                );
                            }
                        }
                    })
                )
            ),
        },
        plugins: [
            appleCredentialLifecycle(
                Option.isSome(appleConfig)
                    ? {
                          clientId: appleConfig.value.clientId,
                          clientSecret: generateAppleClientSecret(
                              appleConfig.value.clientId,
                              appleConfig.value.teamId,
                              appleConfig.value.keyId,
                              Redacted.value(appleConfig.value.privateKey)
                          ),
                      }
                    : null,
                {
                    resumeUserId: Effect.fn("BetterAuth.resumeUserId")(function* resumeUserId(resumeSecret: string) {
                        if (!("runQuery" in ctx)) {
                            return yield* new AppleLifecycleError({ reason: "resumeFailed" });
                        }
                        return yield* Effect.tryPromise({
                            catch: (cause) => new AppleLifecycleError({ cause, reason: "resumeFailed" }),
                            try: () => ctx.runQuery(internal.accountDeletion.resumeUserId, { resumeSecret }),
                        });
                    }),
                }
            ),
            emailOTP({
                expiresIn: EMAIL_CODE_TTL_SECONDS,
                overrideDefaultEmailVerification: true,
                sendVerificationOTP: ({ email, otp, type }, endpoint) =>
                    runEdge(
                        Effect.gen(function* sendVerificationOTP() {
                            if (type !== "email-verification" && type !== "forget-password") {
                                return;
                            }
                            const purpose = type === "forget-password" ? "reset" : "verify";
                            const language = emailLanguage(endpoint?.request?.headers ?? endpoint?.headers);
                            yield* sendEmail(email, codeEmail(otp, purpose, language));
                        }).pipe(Effect.provide(outboundHttp))
                    ),
                storeOTP: "hashed",
            }),
            expo(),
            crossDomain({ siteUrl }),
            convex({
                authConfig,
                jwksRotateOnTokenGenerationError: true,
            }),
        ],
        session: {
            expiresIn: LONGEST_COOKIE_MAX_AGE_SECONDS,
        },
        socialProviders: {
            // Better Auth drops a provider whole on `enabled: false`, so the configured branch must never return it.
            apple: () =>
                runEdge(
                    Effect.gen(function* appleProvider() {
                        if (Option.isNone(appleConfig)) {
                            return {
                                clientId: "",
                                clientSecret: "",
                                enabled: false,
                            };
                        }
                        const apple = appleConfig.value;
                        return {
                            appBundleIdentifier: apple.clientId,
                            clientId: apple.webClientId,
                            clientSecret: yield* generateAppleClientSecret(
                                apple.webClientId,
                                apple.teamId,
                                apple.keyId,
                                Redacted.value(apple.privateKey)
                            ),
                            enabled: true,
                        };
                    })
                ),
            google: Option.isSome(googleConfig)
                ? {
                      clientId: [googleConfig.value.clientIdWeb, googleConfig.value.clientIdIos],
                      clientSecret: Redacted.value(googleConfig.value.clientSecret),
                      prompt: "select_account consent",
                  }
                : {
                      clientId: [],
                      clientSecret: "",
                  },
        },
        trustedOrigins: [siteUrl, nativeAppUrl, "exp://", "https://appleid.apple.com"],
        user: {
            deleteUser: {
                enabled: false,
            },
        },
    });
}

export { createAuth };

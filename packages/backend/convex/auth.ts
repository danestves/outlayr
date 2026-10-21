import { expo } from "@better-auth/expo";
import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { env } from "@outlayr/env/backend";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { emailOTP, mcp } from "better-auth/plugins";
import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import {
    accountExistsEmail,
    codeEmail,
    EMAIL_CODE_TTL_SECONDS,
    emailConfigured,
    emailLanguage,
    sendEmail,
} from "./lib/email";
import { sha256Hex } from "./lib/sha256Hex";
import { appleCredentialLifecycle } from "./providerLifecycle";

/** `CONVEX_SITE_URL` is always set when deployed; `SITE_URL` only exists with a web client. Read per call. */
function resolveSiteUrl() {
    return process.env.SITE_URL || process.env.CONVEX_SITE_URL || "http://localhost:3000";
}

function resolveNativeAppUrl() {
    return process.env.NATIVE_APP_URL || "outlayr://";
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

const emailBody = z.object({ email: z.string() });

export const authComponent = createClient<DataModel>(components.betterAuth);

const appleConfig = (() => {
    const clientId = env.APPLE_CLIENT_ID;
    const teamId = env.APPLE_TEAM_ID;
    const keyId = env.APPLE_KEY_ID;
    const privateKey = env.APPLE_PRIVATE_KEY;

    if (clientId && teamId && keyId && privateKey) {
        return { clientId, keyId, privateKey, teamId, webClientId: env.APPLE_WEB_CLIENT_ID ?? clientId };
    }

    return null;
})();

const googleConfig = (() => {
    const clientIdWeb = env.GOOGLE_CLIENT_ID_WEB;
    const clientIdIos = env.GOOGLE_CLIENT_ID_IOS;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;

    if (clientIdWeb && clientIdIos && clientSecret) {
        return { clientId: [clientIdWeb, clientIdIos], clientSecret };
    }

    return null;
})();

/** Apple's client secret is an ES256 JWT valid six months at most, so it is minted per request. */
async function generateAppleClientSecret(clientId: string, teamId: string, keyId: string, privateKey: string) {
    const key = await importPKCS8(privateKey, "ES256");
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: keyId })
        .setIssuer(teamId)
        .setSubject(clientId)
        .setAudience("https://appleid.apple.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 180 * 24 * 60 * 60)
        .sign(key);
}

function createAuth(ctx: GenericCtx<DataModel>) {
    const siteUrl = resolveSiteUrl();
    const nativeAppUrl = resolveNativeAppUrl();
    const mcpLoginPage = `${siteUrl}/mcp/login`;

    return betterAuth({
        account: { encryptOAuthTokens: true, updateAccountOnSignIn: false },
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // The app uses neither: codes only confirm an address or reset a password.
        disabledPaths: ["/forget-password/email-otp", "/send-verification-email", "/sign-in/email-otp"],
        emailAndPassword: {
            enabled: emailConfigured,
            onExistingUserSignUp: async ({ user }, request) => {
                await sendEmail(user.email, accountExistsEmail(emailLanguage(request?.headers)));
            },
            requireEmailVerification: true,
            revokeSessionsOnPasswordReset: true,
        },
        emailVerification: {
            autoSignInAfterVerification: true,
            sendOnSignIn: true,
        },
        hooks: {
            before: createAuthMiddleware(async (endpoint) => {
                if (endpoint.path === "/mcp/authorize") {
                    return { context: { query: { ...endpoint.query, prompt: "consent" } } };
                }
                const body = emailBody.safeParse(endpoint.body);
                if (EMAIL_LIMITED_PATHS.has(endpoint.path) && body.success) {
                    const key = await sha256Hex(body.data.email.trim().toLowerCase());
                    const { ok } = await emailLimiter.limit(requireRunMutationCtx(ctx), "emailAuth", { key });
                    if (!ok) {
                        throw new APIError("TOO_MANY_REQUESTS", { message: "Too many attempts for this email" });
                    }
                }
            }),
        },
        plugins: [
            appleCredentialLifecycle(
                appleConfig
                    ? {
                          clientId: appleConfig.clientId,
                          clientSecret: () =>
                              generateAppleClientSecret(
                                  appleConfig.clientId,
                                  appleConfig.teamId,
                                  appleConfig.keyId,
                                  appleConfig.privateKey
                              ),
                      }
                    : null,
                {
                    resumeUserId: async (resumeSecret) => {
                        if (!("runQuery" in ctx)) {
                            throw new Error("Apple credential revocation needs a query context");
                        }
                        return await ctx.runQuery(internal.accountDeletion.resumeUserId, { resumeSecret });
                    },
                }
            ),
            emailOTP({
                expiresIn: EMAIL_CODE_TTL_SECONDS,
                overrideDefaultEmailVerification: true,
                sendVerificationOTP: async ({ email, otp, type }, endpoint) => {
                    if (type !== "email-verification" && type !== "forget-password") {
                        return;
                    }
                    const purpose = type === "forget-password" ? "reset" : "verify";
                    const language = emailLanguage(endpoint?.request?.headers ?? endpoint?.headers);
                    await sendEmail(email, codeEmail(otp, purpose, language));
                },
                storeOTP: "hashed",
            }),
            expo(),
            crossDomain({ siteUrl }),
            convex({
                authConfig,
                jwksRotateOnTokenGenerationError: true,
            }),
            mcp({
                loginPage: mcpLoginPage,
                oidcConfig: { consentPage: `${siteUrl}/mcp/consent`, loginPage: mcpLoginPage, requirePKCE: true },
            }),
        ],
        session: {
            expiresIn: LONGEST_COOKIE_MAX_AGE_SECONDS,
        },
        socialProviders: {
            // Better Auth drops a provider whole on `enabled: false`, so the configured branch must never return it.
            apple: async () => {
                if (!appleConfig) {
                    return {
                        clientId: "",
                        clientSecret: "",
                        enabled: false,
                    };
                }

                return {
                    appBundleIdentifier: appleConfig.clientId,
                    clientId: appleConfig.webClientId,
                    clientSecret: await generateAppleClientSecret(
                        appleConfig.webClientId,
                        appleConfig.teamId,
                        appleConfig.keyId,
                        appleConfig.privateKey
                    ),
                    enabled: true,
                };
            },
            google: googleConfig
                ? {
                      clientId: googleConfig.clientId,
                      clientSecret: googleConfig.clientSecret,
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

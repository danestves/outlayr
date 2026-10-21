/// <reference types="vite/client" />

import betterAuthTest from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { apple as appleProvider } from "better-auth/social-providers";
import { convexTest } from "convex-test";
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createAuth } from "./auth";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** A throwaway P-256 key, only so `generateAppleClientSecret` has something to sign with. */
const APPLE_TEST_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgXkjMeO1+ck8HgMHC
ipgW4DI3YYzFM8Yv1eUf0Bv2ID6hRANCAASSDa0TEa2kqSLgNw30wzl0sObor81R
Hz8YSjsV6hhmjjG3X5hJep3DQh4aSLJLnzqlGwbmhKpI+3vuaqtsaErm
-----END PRIVATE KEY-----`;

const baseUrlWith = async (vars: Record<string, string>) => {
    for (const [name, value] of Object.entries(vars)) {
        vi.stubEnv(name, value);
    }
    const t = convexTest(schema, modules);
    return await t.run(async (ctx) => createAuth(ctx).options.baseURL);
};

const resolveApple = async (vars: Record<string, string>) => {
    vi.stubEnv("APPLE_CLIENT_ID", "com.tryoutlayr.app");
    vi.stubEnv("APPLE_TEAM_ID", "TEAM123456");
    vi.stubEnv("APPLE_KEY_ID", "KEY1234567");
    vi.stubEnv("APPLE_PRIVATE_KEY", APPLE_TEST_KEY);
    for (const [name, value] of Object.entries(vars)) {
        vi.stubEnv(name, value);
    }
    vi.resetModules();
    const { createAuth: build } = await import("./auth");
    const t = convexTest(schema, modules);
    const apple = await t.run(async (ctx) => {
        const factory = build(ctx).options.socialProviders?.apple;
        return typeof factory === "function" ? await factory() : factory;
    });
    if (!apple) {
        throw new Error("Apple provider is missing");
    }
    return apple;
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("auth base url", () => {
    it("falls back to the deployment site url when SITE_URL is unset", async () => {
        const baseURL = await baseUrlWith({
            CONVEX_SITE_URL: "https://example-deployment.convex.site",
            SITE_URL: "",
        });

        expect(baseURL).toBe("https://example-deployment.convex.site");
    });

    it("prefers an explicit SITE_URL over the deployment site url", async () => {
        const baseURL = await baseUrlWith({
            CONVEX_SITE_URL: "https://example-deployment.convex.site",
            SITE_URL: "https://app.tryoutlayr.com",
        });

        expect(baseURL).toBe("https://app.tryoutlayr.com");
    });
});

describe("auth", () => {
    // The instance cannot cross `t.run`: Convex reserves the `$` prefix of its `$ERROR_CODES` field.
    it("builds without any social provider credentials", async () => {
        const t = convexTest(schema, modules);

        const handlerType = await t.run(async (ctx) => typeof createAuth(ctx).handler);

        expect(handlerType).toBe("function");
    });

    // The APPLE_* variables are read at module scope, so the module is re-imported after stubbing.
    it("enables the Apple provider once its credentials are configured", async () => {
        const apple = await resolveApple({});

        expect(apple.enabled).toBeTruthy();
        expect(apple.clientId).toBe("com.tryoutlayr.app");
    });

    it("signs in on the web with the Services ID and keeps verifying native id tokens against the bundle id", async () => {
        const apple = await resolveApple({ APPLE_WEB_CLIENT_ID: "com.danestves.outlayr.si" });
        const { privateKey, publicKey } = await generateKeyPair("ES256");
        const jwk = { ...(await exportJWK(publicKey)), alg: "ES256", kid: "apple-test" };
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({ keys: [jwk] }))
        );
        const nativeIdToken = await new SignJWT({ nonce: "native-nonce" })
            .setProtectedHeader({ alg: "ES256", kid: "apple-test" })
            .setIssuer("https://appleid.apple.com")
            .setAudience("com.tryoutlayr.app")
            .setSubject("001234.apple-subject")
            .setIssuedAt()
            .sign(privateKey);

        expect(apple.clientId).toBe("com.danestves.outlayr.si");
        expect(decodeJwt(apple.clientSecret).sub).toBe("com.danestves.outlayr.si");
        await expect(appleProvider(apple).verifyIdToken(nativeIdToken, "native-nonce")).resolves.toBeTruthy();
    });

    it("disables Better Auth public deletion while the resumable job owns deletion", async () => {
        const t = convexTest(schema, modules);

        const enabled = await t.run(async (ctx) => createAuth(ctx).options.user?.deleteUser?.enabled);

        expect(enabled).toBeFalsy();
    });
});

interface SentEmail {
    subject: string;
    text: string;
    to: string;
}

function stubEmail(): SentEmail[] {
    const sent: SentEmail[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
            sent.push(JSON.parse(String(init?.body)));
            return Response.json({ errors: [], success: true });
        })
    );
    return sent;
}

function emailAuth() {
    const t = convexTest(schema, modules);
    betterAuthTest.register(t);
    rateLimiterTest.register(t);
    return async (path: string, body: Record<string, string>, language = "en") =>
        await t.run(async (ctx) => {
            const response = await createAuth(ctx).handler(
                new Request(`http://localhost:3000/api/auth${path}`, {
                    body: JSON.stringify(body),
                    headers: {
                        "accept-language": language,
                        "content-type": "application/json",
                        origin: "http://localhost:3000",
                    },
                    method: "POST",
                })
            );
            const json: { code?: string; token?: string | null } = await response.json();
            return { ...json, status: response.status };
        });
}

const codeIn = (email: SentEmail | undefined) => email?.text.match(/\d{6}/)?.[0] ?? "";

describe("email sign-in", () => {
    const credentials = { email: "ana@example.com", name: "", password: "correct horse" };

    it("confirms the address with a code before it opens a session", async () => {
        const sent = stubEmail();
        const post = emailAuth();

        await expect(post("/sign-up/email", credentials)).resolves.toMatchObject({ status: 200, token: null });
        await expect(post("/sign-in/email", credentials)).resolves.toMatchObject({
            code: "EMAIL_NOT_VERIFIED",
            status: 403,
        });
        const verified = await post("/email-otp/verify-email", { email: credentials.email, otp: codeIn(sent.at(-1)) });

        expect(sent).toHaveLength(2);
        expect(sent[0]).toMatchObject({
            subject: expect.stringContaining("Your Outlayr code"),
            to: credentials.email,
        });
        expect(verified).toMatchObject({ status: 200, token: expect.any(String) });
    });

    it("answers a taken address like a new one and tells its owner instead", async () => {
        const sent = stubEmail();
        const post = emailAuth();

        await post("/sign-up/email", credentials);
        const again = await post("/sign-up/email", { ...credentials, password: "another password" }, "es-419");

        expect(again).toMatchObject({ status: 200, token: null });
        expect(sent.at(-1)?.subject).toBe("Ya tienes una cuenta de Outlayr");
    });

    it("stops trying passwords for one address after ten attempts", async () => {
        stubEmail();
        const post = emailAuth();
        const statuses: number[] = [];

        for (let attempt = 0; attempt < 11; attempt += 1) {
            // oxlint-disable-next-line no-await-in-loop -- each attempt has to spend the bucket before the next
            statuses.push((await post("/sign-in/email", credentials)).status);
        }

        expect(statuses.slice(0, 10)).toStrictEqual(Array.from({ length: 10 }, () => 401));
        expect(statuses.at(-1)).toBe(429);
    });
});

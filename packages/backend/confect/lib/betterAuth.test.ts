/// <reference types="vite/client" />

import betterAuthTest from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workpoolTest from "@convex-dev/workpool/test";
import { isDynamicBaseURLConfig, resolveDynamicBaseURL } from "better-auth";
import { verifyProviderIdToken } from "better-auth/oauth2";
import { apple as appleProvider } from "better-auth/social-providers";
import { convexTest } from "convex-test";
import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import schema from "../../convex/schema";
import { createAuth } from "./betterAuth";
import { guestLimiter } from "./guestLimits";

const modules = import.meta.glob("../../convex/**/*.ts");

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
    const { createAuth: build } = await import("./betterAuth");
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
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("auth base url", () => {
    it("falls back to the deployment site url when SITE_URL is unset", async () => {
        const baseURL = await baseUrlWith({
            CONVEX_SITE_URL: "https://example-deployment.convex.site",
            SITE_URL: "",
        });

        expect(baseURL).toStrictEqual({
            allowedHosts: ["example-deployment.convex.site"],
            fallback: "https://example-deployment.convex.site",
            protocol: "https",
        });
    });

    it("prefers an explicit SITE_URL over the deployment site url", async () => {
        const baseURL = await baseUrlWith({
            CONVEX_SITE_URL: "https://example-deployment.convex.site",
            SITE_URL: "https://app.tryoutlayr.com",
        });

        expect(baseURL).toStrictEqual({
            allowedHosts: ["app.tryoutlayr.com", "example-deployment.convex.site"],
            fallback: "https://app.tryoutlayr.com",
            protocol: "https",
        });
    });

    it("builds https callbacks for a request that reached the proxy over http", async () => {
        const baseURL = await baseUrlWith({
            CONVEX_SITE_URL: "https://example-deployment.convex.site",
            SITE_URL: "https://tryoutlayr.com",
        });
        if (!isDynamicBaseURLConfig(baseURL)) {
            throw new Error("Expected a dynamic base url");
        }
        const proxied = new Request("http://tryoutlayr.com/api/auth/sign-in/social", {
            headers: { "x-forwarded-host": "tryoutlayr.com", "x-forwarded-proto": "http" },
        });

        expect(resolveDynamicBaseURL(baseURL, proxied, "/api/auth", true)).toBe("https://tryoutlayr.com/api/auth");
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
        const { privateKey, publicKey } = await generateKeyPair("RS256");
        const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", kid: "apple-test" };
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({ keys: [jwk] }))
        );
        const nativeIdToken = await new SignJWT({ nonce: "native-nonce" })
            .setProtectedHeader({ alg: "RS256", kid: "apple-test" })
            .setIssuer("https://appleid.apple.com")
            .setAudience("com.tryoutlayr.app")
            .setSubject("001234.apple-subject")
            .setIssuedAt()
            .setExpirationTime("10m")
            .sign(privateKey);

        expect(apple.clientId).toBe("com.danestves.outlayr.si");
        expect(decodeJwt(apple.clientSecret).sub).toBe("com.danestves.outlayr.si");
        await expect(verifyProviderIdToken(appleProvider(apple), nativeIdToken, "native-nonce")).resolves.toBeTruthy();
    });

    it("disables Better Auth public deletion while the resumable job owns deletion", async () => {
        const t = convexTest(schema, modules);

        const enabled = await t.run(async (ctx) => createAuth(ctx).options.user?.deleteUser?.enabled);

        expect(enabled).toBeFalsy();
    });
});

describe("Notion", () => {
    it("links as an import source but never opens a session", async () => {
        vi.stubEnv("NOTION_CLIENT_ID", "notion-client");
        vi.stubEnv("NOTION_CLIENT_SECRET", "notion-secret");
        const t = convexTest(schema, modules);
        betterAuthTest.register(t);
        rateLimiterTest.register(t);

        const response = await t.fetch("/api/auth/sign-in/social", {
            body: JSON.stringify({ callbackURL: "/", provider: "notion" }),
            headers: { "content-type": "application/json", origin: "http://localhost:3000" },
            method: "POST",
        });

        expect(response.status).toBe(403);
    });
});

interface SentEmail {
    subject: string;
    text: string;
    to: string[];
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
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    betterAuthTest.register(t);
    rateLimiterTest.register(t);
    workpoolTest.register(t, "emailPool");
    const drain = () => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1000));
    const post = async (path: string, body: Record<string, string>, language = "en") => {
        const response = await t.fetch(`/api/auth${path}`, {
            body: JSON.stringify(body),
            headers: {
                "accept-language": language,
                "content-type": "application/json",
                origin: "http://localhost:3000",
            },
            method: "POST",
        });
        const json: { code?: string; token?: string | null } = await response.json();
        return { ...json, status: response.status };
    };
    return { drain, post };
}

const codeIn = (email: SentEmail | undefined) => email?.text.match(/\d{6}/)?.[0] ?? "";

async function nthCode(drain: () => Promise<void>, sent: SentEmail[], count: number) {
    await drain();
    expect(sent).toHaveLength(count);
    return codeIn(sent.at(-1));
}

describe("email sign-in", () => {
    const credentials = { email: "ana@example.com", name: "", password: "correct horse" };

    it("confirms the address with a code before it opens a session", async () => {
        const sent = stubEmail();
        const { drain, post } = emailAuth();

        await expect(post("/sign-up/email", credentials)).resolves.toMatchObject({ status: 200, token: null });
        await nthCode(drain, sent, 1);
        await expect(post("/sign-in/email", credentials)).resolves.toMatchObject({
            code: "EMAIL_NOT_VERIFIED",
            status: 403,
        });
        const verified = await post("/email-otp/verify-email", {
            email: credentials.email,
            otp: await nthCode(drain, sent, 2),
        });

        expect(sent[0]).toMatchObject({
            subject: expect.stringContaining("Your Outlayr code"),
            to: [credentials.email],
        });
        expect(verified).toMatchObject({ status: 200, token: expect.any(String) });
        await drain();
        expect(sent.map(({ subject }) => subject).slice(2)).toStrictEqual(["Your Outlayr account is ready"]);
    });

    it("signs up with no email provider by logging the code", async () => {
        vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
        vi.stubEnv("CLOUDFLARE_EMAIL_TOKEN", "");
        vi.stubEnv("EMAIL_FROM", "");
        const network = vi.fn();
        vi.stubGlobal("fetch", network);
        const log = vi.spyOn(console, "log").mockReturnValue(undefined);
        const { post } = emailAuth();

        await expect(post("/sign-up/email", credentials)).resolves.toMatchObject({ status: 200, token: null });
        const logged = log.mock.calls.map(([line]) => String(line)).find((line) => line.includes("Your Outlayr code"));
        const verified = await post("/email-otp/verify-email", {
            email: credentials.email,
            otp: logged?.match(/\d{6}/)?.[0] ?? "",
        });

        expect(verified).toMatchObject({ status: 200, token: expect.any(String) });
        expect(network).not.toHaveBeenCalled();
    });

    it("refuses to start a code when the email provider is half set up", async () => {
        const sent = stubEmail();
        vi.stubEnv("EMAIL_PROVIDER", "smtp");
        const { drain, post } = emailAuth();

        await expect(post("/sign-up/email", credentials)).resolves.toMatchObject({ status: 503 });
        await expect(post("/email-otp/request-password-reset", { email: credentials.email })).resolves.toMatchObject({
            status: 503,
        });
        vi.stubEnv("EMAIL_PROVIDER", "cloudflare");
        await expect(post("/sign-up/email", credentials)).resolves.toMatchObject({ status: 200, token: null });
        await drain();
        expect(sent.map(({ subject }) => subject)).toStrictEqual([expect.stringContaining("Your Outlayr code")]);
    });

    it("keeps verified password sign-in while email is broken, without sending codes", async () => {
        const sent = stubEmail();
        const { drain, post } = emailAuth();
        const pending = { ...credentials, email: "bea@example.com" };
        await post("/sign-up/email", credentials);
        await post("/email-otp/verify-email", { email: credentials.email, otp: await nthCode(drain, sent, 1) });
        await post("/sign-up/email", pending);
        await drain();
        expect(sent).toHaveLength(3);
        vi.stubEnv("EMAIL_PROVIDER", "sendgrid");

        await expect(post("/sign-in/email", credentials)).resolves.toMatchObject({
            status: 200,
            token: expect.any(String),
        });
        const errors = vi.spyOn(console, "error").mockReturnValue(undefined);
        await expect(post("/sign-in/email", pending)).resolves.toMatchObject({
            code: "EMAIL_NOT_VERIFIED",
            status: 403,
        });
        expect(errors).not.toHaveBeenCalled();
        await expect(post("/sign-up/email", { ...credentials, email: "cy@example.com" })).resolves.toMatchObject({
            status: 503,
        });
        expect(sent).toHaveLength(3);
    });

    it("answers a taken address like a new one and tells its owner instead", async () => {
        const sent = stubEmail();
        const { drain, post } = emailAuth();

        await post("/sign-up/email", credentials);
        const again = await post("/sign-up/email", { ...credentials, password: "another password" }, "es-419");

        expect(again).toMatchObject({ status: 200, token: null });
        await drain();
        expect(sent.at(-1)?.subject).toBe("Ya tienes una cuenta de Outlayr");
    });

    it("stops trying passwords for one address after ten attempts", async () => {
        stubEmail();
        const { post } = emailAuth();
        const statuses: number[] = [];

        for (let attempt = 0; attempt < 11; attempt += 1) {
            statuses.push((await post("/sign-in/email", credentials)).status);
        }

        expect(statuses.slice(0, 10)).toStrictEqual(Array.from({ length: 10 }, () => 401));
        expect(statuses.at(-1)).toBe(429);
    });
});

describe("guest sign-in", () => {
    const MINUTE = 60 * 1000;

    function guestAuth() {
        vi.useFakeTimers();
        const t = convexTest(schema, modules);
        betterAuthTest.register(t);
        rateLimiterTest.register(t);
        const signIn = async (address: string) => {
            const response = await t.fetch("/api/auth/sign-in/anonymous", {
                body: "{}",
                headers: {
                    "cf-connecting-ip": address,
                    "content-type": "application/json",
                    origin: "http://localhost:3000",
                },
                method: "POST",
            });
            return response.status;
        };
        const signInTimes = async (address: string, count: number) => {
            const statuses: number[] = [];
            for (let attempt = 0; attempt < count; attempt += 1) {
                statuses.push(await signIn(address));
            }
            return statuses;
        };
        const callerKeys = async () => {
            const jobs = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect());
            return new Set(jobs.map((job): string => job.args[0].key));
        };
        const bucketTouchedAt = (key: string) =>
            t.run(async (ctx) => (await guestLimiter.getValue(ctx, "guestSignInPerCaller", { key })).ts);
        return { bucketTouchedAt, callerKeys, signIn, signInTimes, t };
    }

    it("limits each caller on its own so one caller cannot lock out new guests", async () => {
        const { callerKeys, signIn, signInTimes } = guestAuth();

        const statuses = await signInTimes("2001:db8:1:2::1", 10);
        statuses.push(await signIn("2001:db8:1:2:ffff::9"));

        expect(statuses).toStrictEqual([...Array.from({ length: 10 }, () => 200), 429]);
        await expect(signIn("203.0.113.7")).resolves.toBe(200);
        const keys = [...(await callerKeys())];
        expect(keys).toHaveLength(2);
        expect(keys.some((key) => key.includes("2001:db8") || key.includes("203.0.113.7"))).toBeFalsy();
    });

    it("drops a caller's bucket only once it has refilled", async () => {
        const { bucketTouchedAt, callerKeys, signInTimes, t } = guestAuth();
        await signInTimes("203.0.113.7", 1);
        vi.advanceTimersByTime(50 * MINUTE);
        await signInTimes("203.0.113.7", 9);

        vi.advanceTimersByTime(10 * MINUTE);
        await t.finishInProgressScheduledFunctions();

        await expect(signInTimes("203.0.113.7", 3)).resolves.toStrictEqual([200, 200, 429]);
        const [key = ""] = await callerKeys();
        await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(60 * MINUTE));
        await expect(bucketTouchedAt(key)).resolves.toBe(0);
    });
});

/// <reference types="vite/client" />

import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const allowedOrigin = async (origin: string) => {
    const t = convexTest(schema, modules);
    const response = await t.fetch("/billing/checkout", { headers: { Origin: origin }, method: "OPTIONS" });
    return response.headers.get("Access-Control-Allow-Origin");
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("billing checkout cors", () => {
    it("never echoes another origin back", async () => {
        vi.stubEnv("SITE_URL", "https://app.tryoutlayr.com");

        await expect(allowedOrigin("https://evil.example")).resolves.toBe("https://app.tryoutlayr.com");
    });
});

describe("billing plan on a deployment without RevenueCat", () => {
    const planFor = async (email: string) => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t, { email });
        return t
            .withIdentity({ sessionId: identity.sessionId, subject: identity.subject })
            .action(api.billing.plan, {});
    };

    it("shows listed accounts as granted and everyone else as unbilled", async () => {
        vi.stubEnv("REVENUECAT_SECRET_KEY", "");
        vi.stubEnv("PRO_ACCOUNTS", "ana@example.com");

        await expect(planFor("ana@example.com")).resolves.toMatchObject({ state: "granted" });
        await expect(planFor("ben@example.com")).resolves.toMatchObject({ state: "unbilled" });
    });

    it("keeps an unread store subscriber retryable where RevenueCat is set up", async () => {
        vi.stubEnv("PRO_ACCOUNTS", "ana@example.com");

        await expect(planFor("ana@example.com")).resolves.toBeNull();
    });
});

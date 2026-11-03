/// <reference types="vite/client" />

import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { MockLanguageModelV3 } from "ai/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { runEdge } from "./lib/runEdge";
import { readNotification } from "./notificationRead";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
});

function mockModel(text: string) {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ text, type: "text" }],
            finishReason: { raw: undefined, unified: "stop" },
            usage: {
                inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: undefined, total: undefined },
                outputTokens: { reasoning: undefined, text: undefined, total: undefined },
            },
            warnings: [],
        }),
    });
}

const SITEGROUND =
    "Your transaction was successful\nYour SiteGround transaction in the amount of USD 22.99 on Nov 02 2026, 20:44 CST was approved on the card ending with 7909.";

describe("notificationRead guards", () => {
    it("refuses a signed-out caller before anything reaches the model", async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.action(api.notificationRead.read, { aiConsent: AI_CONSENT_VERSION, text: SITEGROUND })
        ).resolves.toStrictEqual({ read: null, status: "unauthenticated" });
    });

    it("never sends the text from a build without the current AI consent", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(
            authenticatedAs(t, identity).action(api.notificationRead.read, { text: SITEGROUND })
        ).resolves.toStrictEqual({ read: null, status: "notConfigured" });
    });
});

describe("readNotification", () => {
    it("drops what the model made up: a negative amount, an unknown currency, a blank merchant", async () => {
        const model = mockModel(
            JSON.stringify({ amount: -22.99, currency: "dollars", kind: "purchase", merchant: "   " })
        );

        await expect(runEdge(readNotification(model, SITEGROUND, "en-US"))).resolves.toStrictEqual({
            read: { amount: null, currency: null, kind: "purchase", merchant: null },
            status: "ok",
        });
    });

    it("keeps a clean read and normalizes the currency code", async () => {
        const model = mockModel(
            JSON.stringify({ amount: 22.99, currency: "usd", kind: "purchase", merchant: " SiteGround " })
        );

        await expect(runEdge(readNotification(model, SITEGROUND, undefined))).resolves.toStrictEqual({
            read: { amount: 22.99, currency: "USD", kind: "purchase", merchant: "SiteGround" },
            status: "ok",
        });
    });

    it("reports invalidResponse when the model answers outside the shape", async () => {
        const model = mockModel(JSON.stringify({ kind: "maybe" }));

        await expect(runEdge(readNotification(model, SITEGROUND, undefined))).resolves.toStrictEqual({
            read: null,
            status: "invalidResponse",
        });
    });
});

/// <reference types="vite/client" />

// Opt-in: RUN_LIVE_MODEL_TESTS=1 plus the configured text provider's key. Transcription is skipped: each turn
// spends a stream credit planted here, so no speech key or recorded clip is needed.

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, seedProUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const model = await liveModel(route({ feature: "voice_entry" }));

describe.skipIf(model === undefined)("voice thread, live", () => {
    it("a sentence becomes a draft, and the next sentence corrects it in place", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const asUser = authenticatedAs(t, await seedProUser(t));
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread");
        }
        const context = {
            accounts: ["Amex", "Checking"],
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: [
                { children: ["Coffee"], name: "Food" },
                { children: [], name: "Groceries" },
            ],
            currency: "USD",
            language: "en-US",
            threadId,
            today: "2026-09-03",
        };
        const say = async (transcript: string) => {
            await t.run(async (ctx) => {
                await ctx.db.insert("voiceStreamCredits", { threadId });
            });
            return asUser.action(api.voiceEntry.speakText, { ...context, transcript });
        };

        await expect(say("Twelve fifty at Starbucks yesterday on the Amex")).resolves.toMatchObject({ status: "ok" });
        const [first] = await asUser.query(api.voiceEntry.turns, { threadId });
        expect(first?.proposed?.draft).toMatchObject({
            accountName: "Amex",
            amount: 12.5,
            date: "2026-09-02",
            domain: "starbucks.com",
            kind: "entry",
        });
        expect(first?.proposed?.quotes).toContainEqual(expect.objectContaining({ field: "amount" }));

        await expect(say("No, that was today, and put it under groceries")).resolves.toMatchObject({ status: "ok" });
        const [, second] = await asUser.query(api.voiceEntry.turns, { threadId });
        expect(second?.proposed?.draft).toMatchObject({
            accountName: "Amex",
            amount: 12.5,
            categoryName: "Groceries",
            date: "2026-09-03",
            kind: "entry",
        });
    }, 120_000);
});

/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workpoolTest from "@convex-dev/workpool/test";
import { MockLanguageModelV3 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { resolveJob } from "./enrichmentQueue";
import { knowledgeKeys } from "./lib/merchantKey";
import { AI_CONSENT_VERSION } from "./lib/models";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const ENQUEUE_ARGS = {
    aiConsent: AI_CONSENT_VERSION,
    categoryTree: [{ children: [], name: "Travel" }],
    currency: "EUR",
    groundedLookup: true,
    income: false,
    localId: "tx-1",
    name: "CARE4BAG AE",
};

function setup() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    workpoolTest.register(t, "enrichmentPool");
    return t;
}

function fastModel(payload: unknown) {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ text: JSON.stringify(payload), type: "text" }],
            finishReason: { raw: undefined, unified: "stop" },
            usage: {
                inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: undefined, total: undefined },
                outputTokens: { reasoning: undefined, text: undefined, total: undefined },
            },
            warnings: [],
        }),
    });
}

function queuedRow(overrides: Partial<Doc<"enrichmentJobs">>): Doc<"enrichmentJobs"> {
    return {
        _creationTime: 0,
        // SAFETY: resolveJob never reads the id; a fixture needs no real document.
        _id: "job" as Doc<"enrichmentJobs">["_id"],
        categoryTree: [{ children: [], name: "Travel" }],
        currency: "EUR",
        grounded: false,
        income: false,
        localId: "tx-1",
        name: "CARE4BAG AE",
        status: "queued",
        userId: "user",
        ...overrides,
    };
}

describe("enqueue", () => {
    it("keeps one queued job per transaction, the latest ask replacing an earlier one", async () => {
        const t = setup();
        const asUser = authenticatedAs(t, await seedProUser(t));

        await asUser.mutation(api.enrichmentQueue.enqueue, ENQUEUE_ARGS);
        await asUser.mutation(api.enrichmentQueue.enqueue, { ...ENQUEUE_ARGS, name: "AIRBNB * HMASFW2JP2" });

        const jobs = await t.run((ctx) => ctx.db.query("enrichmentJobs").collect());
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toMatchObject({ grounded: true, name: "AIRBNB * HMASFW2JP2", status: "queued" });
    });

    it("keeps a free account's job off the web", async () => {
        const t = setup();
        const asUser = authenticatedAs(t, await seedAuthUser(t));

        await asUser.mutation(api.enrichmentQueue.enqueue, ENQUEUE_ARGS);

        const [job] = await t.run((ctx) => ctx.db.query("enrichmentJobs").collect());
        expect(job?.grounded).toBeFalsy();
    });

    it("queues nothing from a build that asked about other AI providers", async () => {
        const t = setup();
        const asUser = authenticatedAs(t, await seedProUser(t));
        const { aiConsent: _consent, ...oldBuild } = ENQUEUE_ARGS;

        await expect(asUser.mutation(api.enrichmentQueue.enqueue, oldBuild)).resolves.toBeFalsy();
        await expect(t.run((ctx) => ctx.db.query("enrichmentJobs").collect())).resolves.toHaveLength(0);
    });

    it("refuses a caller with no session", async () => {
        const t = setup();

        await expect(t.mutation(api.enrichmentQueue.enqueue, ENQUEUE_ARGS)).rejects.toThrow("Unauthenticated");
    });
});

describe(resolveJob, () => {
    it("answers from published knowledge without asking a model", async () => {
        const t = setup();
        await t.run((ctx) =>
            ctx.db.insert("merchantKnowledge", {
                categoryName: "Travel",
                domain: "care4bag.gr",
                emoji: null,
                key: "care4bag ae|eur",
                merchantName: "Care4Bag",
                modelId: "test",
                parentCategoryName: null,
                resolvedAt: Date.now(),
                tags: ["luggage"],
            })
        );
        const silent = new MockLanguageModelV3({
            doGenerate: () => {
                throw new Error("no model call expected");
            },
        });

        const answer = await t.action((ctx) => resolveJob(ctx, queuedRow({ grounded: true }), { fast: silent }));

        expect(answer).toMatchObject({
            categoryName: "Travel",
            domain: "care4bag.gr",
            isNewCategory: false,
            merchantName: "Care4Bag",
        });
    });

    it("searches the web for a merchant once a day, leaving later jobs to the fast model", async () => {
        const t = setup();
        let searches = 0;
        const grounding = new MockLanguageModelV3({
            doGenerate: () => {
                searches += 1;
                throw new Error("no publishable answer");
            },
        });
        const fast = fastModel({
            brand: "Care4Bag",
            categoryName: "Travel",
            domain: null,
            domainConfidence: "low",
            isNewCategory: false,
            tags: [],
        });
        const resolve = () =>
            t.action((ctx) =>
                resolveJob(ctx, queuedRow({ grounded: true }), { fast, grounded: { grounding, groundingTools: {} } })
            );

        await resolve();
        const retry = await resolve();

        expect(searches).toBe(1);
        expect(retry).toMatchObject({ categoryName: "Travel", merchantName: "Care4Bag" });
    });

    it("keeps a row off the web when its owner withdrew consent, and still names the merchant", async () => {
        const t = setup();
        const fast = fastModel({
            brand: "Care4Bag",
            categoryName: "Travel",
            domain: null,
            domainConfidence: "low",
            isNewCategory: false,
            tags: ["luggage"],
        });

        const answer = await t.action((ctx) => resolveJob(ctx, queuedRow({ grounded: false }), { fast }));

        expect(answer).toMatchObject({ categoryName: "Travel", domain: null, merchantName: "Care4Bag" });
    });
});

describe("shared answers", () => {
    it("a model answer is kept under the merchant's aliases, so another descriptor for it hits", async () => {
        const t = setup();
        const fast = fastModel({
            brand: "Airbnb",
            categoryName: "Travel",
            domain: "airbnb.com",
            domainConfidence: "high",
            isNewCategory: false,
            tags: ["lodging"],
        });

        await t.action((ctx) => resolveJob(ctx, queuedRow({ grounded: false, name: "AIRBNB * HMASFW2JP2" }), { fast }));

        const later = await t.query(internal.merchantKnowledge.lookup, {
            keys: knowledgeKeys("AIRBNB * ZX81KQ7", "EUR"),
            now: Date.now(),
        });
        expect(later).toMatchObject({ domain: "airbnb.com", merchantName: "Airbnb", source: "model" });
    });

    it("keeps an answer filed under a category of the owner's own off the shared table", async () => {
        const t = setup();
        const fast = fastModel({
            brand: "Care4Bag",
            categoryName: "Trips",
            domain: "care4bag.gr",
            domainConfidence: "high",
            isNewCategory: true,
            tags: [],
        });

        await t.action((ctx) =>
            resolveJob(ctx, queuedRow({ categoryTree: [{ children: [], name: "Trips" }] }), { fast })
        );

        await expect(t.run((ctx) => ctx.db.query("merchantKnowledge").collect())).resolves.toStrictEqual([]);
    });
});

describe("results and ack", () => {
    it("hand back only the caller's answered jobs, and forget the acknowledged ones", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);
        const other = await seedAuthUser(t);
        const answer = {
            categoryName: "Travel",
            domain: "care4bag.gr",
            emoji: null,
            isNewCategory: false,
            merchantName: "Care4Bag",
            parentCategoryName: null,
            tags: [],
        };
        await t.run(async (ctx) => {
            const base = { categoryTree: [], grounded: false, income: false, name: "CARE4BAG AE" };
            await ctx.db.insert("enrichmentJobs", {
                ...base,
                localId: "done",
                result: answer,
                status: "done",
                userId: owner.userId,
            });
            await ctx.db.insert("enrichmentJobs", {
                ...base,
                localId: "queued",
                status: "queued",
                userId: owner.userId,
            });
            await ctx.db.insert("enrichmentJobs", {
                ...base,
                localId: "theirs",
                result: answer,
                status: "done",
                userId: other.userId,
            });
        });
        const asOwner = authenticatedAs(t, owner);

        await expect(asOwner.query(api.enrichmentQueue.results, {})).resolves.toStrictEqual([
            { localId: "done", name: "CARE4BAG AE", result: answer },
        ]);

        await asOwner.mutation(api.enrichmentQueue.ack, { localIds: ["done", "queued"] });

        const left = await t.run((ctx) => ctx.db.query("enrichmentJobs").collect());
        expect(left.map((row) => row.localId).sort()).toStrictEqual(["queued", "theirs"]);
    });
});

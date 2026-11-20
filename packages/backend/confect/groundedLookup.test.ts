/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { fails, fakeModel, searched } from "@outlayr/ai/testing";
import type { FakeResponseStep } from "@outlayr/ai/testing";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vite-plus/test";

import schema from "../convex/schema";
import { GROUNDED_REQUEST_TIMEOUT_MS, rateLimiter } from "./enrichment";
import { runGroundedLookup, runGroundedLookupCall } from "./groundedLookup";
import type { GroundedLookupCtx, GroundedRunArgs } from "./groundedLookup";
import { runEdge } from "./lib/runEdge";

const modules = import.meta.glob("../convex/**/*.ts");

const searchModel = (...responses: FakeResponseStep[]) =>
    fakeModel(responses, { feature: "grounded_lookup", webSearch: true });

const callLookup = (fake: ReturnType<typeof searchModel>, args: GroundedRunArgs) =>
    runEdge(runGroundedLookupCall(fake.model, args));

const callRun = (ctx: GroundedLookupCtx, args: GroundedRunArgs, fake: ReturnType<typeof searchModel>) =>
    runEdge(runGroundedLookup(ctx, args, fake.model));

const sentPrompt = (fake: ReturnType<typeof searchModel>) => JSON.stringify(fake.requests[0]?.messages);

const BASE_ARGS = { income: false, key: "farmatodo", name: "Farmatodo" };

const CONFIDENT_PAYLOAD = {
    categoryName: "Healthcare",
    domain: "farmatodo.com",
    emoji: "💊",
    tags: ["pharmacy"],
};

describe("runGroundedLookupCall (single-call collapse, measured 2026-08-03)", () => {
    it("the single call carries the injected web_search tool set", async () => {
        const grounding = searchModel({ text: JSON.stringify(CONFIDENT_PAYLOAD) });

        await callLookup(grounding, BASE_ARGS);

        expect(grounding.requests[0]?.tools).toStrictEqual([expect.objectContaining({ name: "web_search" })]);
    });

    it("parses JSON wrapped in a ```json fence", async () => {
        const text = [
            "Here is what I found after searching:",
            "```json",
            JSON.stringify(CONFIDENT_PAYLOAD),
            "```",
        ].join("\n");
        const grounding = searchModel(searched(text, ["https://farmatodo.com/about"]));

        const outcome = await callLookup(grounding, BASE_ARGS);

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
        });
    });

    it("parses JSON wrapped in surrounding prose with no fence at all", async () => {
        const text = `Based on my search, this is a pharmacy chain. ${JSON.stringify(CONFIDENT_PAYLOAD)} I am confident in this answer.`;
        const grounding = searchModel(searched(text, ["https://farmatodo.com/about"]));

        const outcome = await callLookup(grounding, BASE_ARGS);

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
        });
    });

    it("degrades to an all-null candidate on unparseable output, without throwing", async () => {
        const grounding = searchModel({ text: "I was unable to confirm any details about this merchant." });

        const outcome = await callLookup(grounding, BASE_ARGS);

        expect(outcome.candidate).toMatchObject({
            categoryName: null,
            domain: null,
            emoji: null,
            tags: [],
        });
    });

    it("does not retry a failed provider call", async () => {
        const throwing = fakeModel([fails("network down")], {
            feature: "grounded_lookup",
            repeat: true,
            webSearch: true,
        });

        await expect(callLookup(throwing, BASE_ARGS)).rejects.toThrow();

        expect(throwing.requests).toHaveLength(1);
    });

    it("a confident, corroborated result reports usage, searches and sources", async () => {
        const grounding = searchModel(searched(JSON.stringify(CONFIDENT_PAYLOAD), ["https://farmatodo.com/about"]));

        const outcome = await callLookup(grounding, BASE_ARGS);

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
            key: "farmatodo",
            tags: ["pharmacy"],
        });
        expect(outcome.sources).toStrictEqual([{ url: "https://farmatodo.com/about" }]);
        expect(outcome.searchCalls).toBe(1);
        expect(outcome.inputTokens).toBeGreaterThan(0);
        expect(outcome.outputTokens).toBeGreaterThan(0);
    });

    it("drops Gemini's grounding redirects, so they cannot corroborate google.com", async () => {
        const redirect = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC123";
        const grounding = searchModel(searched(JSON.stringify(CONFIDENT_PAYLOAD), [redirect]));

        const outcome = await callLookup(grounding, BASE_ARGS);

        expect(outcome.sources).toStrictEqual([]);
    });

    it("threads a region code into the prompt", async () => {
        const grounding = searchModel(searched(JSON.stringify(CONFIDENT_PAYLOAD), ["https://farmatodo.com/about"]));

        await callLookup(grounding, { ...BASE_ARGS, regionCode: "VE" });

        const sent = sentPrompt(grounding);
        expect(sent).toContain("VE");
    });

    it("threads the purchase currency and the descriptor hint into the prompt", async () => {
        const grounding = searchModel(searched(JSON.stringify(CONFIDENT_PAYLOAD), ["https://farmatodo.com/about"]));

        await callLookup(grounding, { ...BASE_ARGS, currency: "EUR" });

        const sent = sentPrompt(grounding);
        expect(sent).toContain("charged in EUR");
        expect(sent).toContain("card-terminal or bank-statement descriptor");
    });
});

describe("runGroundedLookup guards (ADR-11 order)", () => {
    it("performs no model work when groundedPerKey is already exhausted for this key", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        await t.run((ctx) => rateLimiter.limit(ctx, "groundedPerKey", { key: "farmatodo" }));
        const grounding = searchModel({ text: "irrelevant" });

        await t.action(async (ctx) => callRun(ctx, BASE_ARGS, grounding));

        expect(grounding.requests).toHaveLength(0);
    });

    it("performs no model work when groundedBudgetMicros is exhausted (T7)", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const limitSpy = vi
            .spyOn(rateLimiter, "limit")
            .mockImplementation(async (_ctx, name) =>
                name === "groundedBudgetMicros" ? { ok: false, retryAfter: 1000 } : { ok: true, retryAfter: undefined }
            );
        const grounding = searchModel({ text: "irrelevant" });

        await t.action(async (ctx) => callRun(ctx, BASE_ARGS, grounding));

        expect(grounding.requests).toHaveLength(0);
        limitSpy.mockRestore();
    });

    it("a confident result writes merchantKnowledge and records spend as published", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const grounding = searchModel(searched(JSON.stringify(CONFIDENT_PAYLOAD), ["https://farmatodo.com/about"]));

        await t.action(async (ctx) => callRun(ctx, BASE_ARGS, grounding));

        const knowledge = await t.run((ctx) =>
            ctx.db
                .query("merchantKnowledge")
                .withIndex("by_key", (q) => q.eq("key", "farmatodo"))
                .unique()
        );
        expect(knowledge).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
        });
        expect(knowledge).not.toHaveProperty("logoKey");

        const spend = await t.run((ctx) => ctx.db.query("groundedSpend").collect());
        expect(spend).toHaveLength(1);
        expect(spend[0]).toMatchObject({ published: true });
    });

    it("a thrown model call records spend as unpublished instead of dying uncaught", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const aborting = searchModel(fails("The operation was aborted"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(t.action(async (ctx) => callRun(ctx, BASE_ARGS, aborting))).resolves.not.toThrow();

        const knowledge = await t.run((ctx) =>
            ctx.db
                .query("merchantKnowledge")
                .withIndex("by_key", (q) => q.eq("key", "farmatodo"))
                .unique()
        );
        expect(knowledge).toBeNull();

        const spend = await t.run((ctx) => ctx.db.query("groundedSpend").collect());
        expect(spend).toHaveLength(1);
        expect(spend[0]).toMatchObject({
            actualMicros: 0,
            published: false,
            searchCalls: 0,
        });
        warnSpy.mockRestore();
    });

    it("an uncorroborated result records spend but writes nothing to merchantKnowledge", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const grounding = searchModel({ text: JSON.stringify(CONFIDENT_PAYLOAD) });

        await t.action(async (ctx) => callRun(ctx, BASE_ARGS, grounding));

        const knowledge = await t.run((ctx) =>
            ctx.db
                .query("merchantKnowledge")
                .withIndex("by_key", (q) => q.eq("key", "farmatodo"))
                .unique()
        );
        expect(knowledge).toBeNull();

        const spend = await t.run((ctx) => ctx.db.query("groundedSpend").collect());
        expect(spend).toHaveLength(1);
        expect(spend[0]).toMatchObject({ published: false });
    });
});

describe("runGroundedLookupCall domain guard (model-hallucinated denylisted domain)", () => {
    it.each([["img.logo.dev", "https://img.logo.dev/about"]])(
        "nulls a corroborated but denylisted domain %s",
        async (domain, sourceUrl) => {
            const grounding = searchModel(searched(JSON.stringify({ ...CONFIDENT_PAYLOAD, domain }), [sourceUrl]));

            const outcome = await callLookup(grounding, BASE_ARGS);

            expect(outcome.candidate.domain).toBeNull();
        }
    );
});

describe("runGroundedLookupCall for a queued row", () => {
    const TREE_ARGS = {
        categoryTree: [{ children: [], name: "Trips" }],
        income: false,
        key: "care4bag ae|eur",
        name: "CARE4BAG AE",
    };

    it("answers in the owner's category and publishes only the canonical one", async () => {
        const grounding = searchModel(
            searched(
                JSON.stringify({
                    canonicalCategory: "Travel",
                    categoryName: "Trips",
                    domain: "care4bag.gr",
                    domainConfidence: "high",
                    emoji: null,
                    merchantName: "Care4Bag",
                    tags: ["luggage"],
                }),
                ["https://www.care4bag.gr/"]
            )
        );

        const outcome = await callLookup(grounding, TREE_ARGS);

        expect(outcome.answer).toStrictEqual({
            categoryName: "Trips",
            domain: "care4bag.gr",
            emoji: null,
            merchantName: "Care4Bag",
            parentCategoryName: null,
            tags: ["luggage"],
        });
        expect(outcome.candidate).toMatchObject({ categoryName: "Travel", merchantName: "Care4Bag" });
        expect(sentPrompt(grounding)).toContain("Trips");
    });

    it("keeps a guessed domain off the answer", async () => {
        const grounding = searchModel({
            text: JSON.stringify({
                canonicalCategory: "Travel",
                categoryName: "Trips",
                domain: "care4bag.com",
                domainConfidence: "low",
                merchantName: "Care4Bag",
                tags: [],
            }),
        });

        const outcome = await callLookup(grounding, TREE_ARGS);

        expect(outcome.answer.domain).toBeNull();
    });
});

describe("grounded abort budget", () => {
    it("stays generous: a live grounded search measures ~3.75s+, and the old 3.5s budget aborted nearly every scheduled run", () => {
        expect(GROUNDED_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    });
});

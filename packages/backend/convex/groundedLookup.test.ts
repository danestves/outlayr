/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vite-plus/test";
import { z } from "zod";

import { GROUNDED_REQUEST_TIMEOUT_MS, rateLimiter } from "./enrichment";
import { runGroundedLookup, runGroundedLookupCall } from "./groundedLookup";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const fakeWebSearchTool = tool({
    description: "test double for the provider-executed web search",
    execute: async () => ({ query: "", sources: [] }),
    inputSchema: z.object({}),
});

function usageStub(inputTokens?: number, outputTokens?: number) {
    return {
        inputTokens: {
            cacheRead: undefined,
            cacheWrite: undefined,
            noCache: undefined,
            total: inputTokens,
        },
        outputTokens: {
            reasoning: undefined,
            text: undefined,
            total: outputTokens,
        },
    };
}

function mockTextModel(text: string, options?: { input?: number; output?: number; sourceUrl?: string }) {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [
                { text, type: "text" },
                ...(options?.sourceUrl
                    ? [
                          {
                              id: "src-1",
                              sourceType: "url" as const,
                              type: "source" as const,
                              url: options.sourceUrl,
                          },
                      ]
                    : []),
            ],
            finishReason: { raw: undefined, unified: "stop" },
            usage: usageStub(options?.input, options?.output),
            warnings: [],
        }),
    });
}

const BASE_ARGS = { income: false, key: "farmatodo", name: "Farmatodo" };

const CONFIDENT_PAYLOAD = {
    categoryName: "Healthcare",
    domain: "farmatodo.com",
    emoji: "💊",
    tags: ["pharmacy"],
};

describe("runGroundedLookupCall (single-call collapse, measured 2026-08-03)", () => {
    it("the single call carries the injected web_search tool set", async () => {
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD));

        await runGroundedLookupCall({ grounding, groundingTools: { web_search: fakeWebSearchTool } }, BASE_ARGS);

        expect(grounding.doGenerateCalls[0]?.tools).toStrictEqual([expect.objectContaining({ name: "web_search" })]);
    });

    it("parses JSON wrapped in a ```json fence", async () => {
        const text = [
            "Here is what I found after searching:",
            "```json",
            JSON.stringify(CONFIDENT_PAYLOAD),
            "```",
        ].join("\n");
        const grounding = mockTextModel(text, {
            sourceUrl: "https://farmatodo.com/about",
        });

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            BASE_ARGS
        );

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
        });
    });

    it("parses JSON wrapped in surrounding prose with no fence at all", async () => {
        const text = `Based on my search, this is a pharmacy chain. ${JSON.stringify(CONFIDENT_PAYLOAD)} I am confident in this answer.`;
        const grounding = mockTextModel(text, {
            sourceUrl: "https://farmatodo.com/about",
        });

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            BASE_ARGS
        );

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
        });
    });

    it("degrades to an all-null candidate on unparseable output, without throwing", async () => {
        const grounding = mockTextModel("I was unable to confirm any details about this merchant.");

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            BASE_ARGS
        );

        expect(outcome.candidate).toMatchObject({
            categoryName: null,
            domain: null,
            emoji: null,
            tags: [],
        });
    });

    it("neither retries after a thrown provider error (maxRetries: 0)", async () => {
        let calls = 0;
        const throwing = new MockLanguageModelV3({
            doGenerate: async () => {
                calls += 1;
                throw new Error("network down");
            },
        });

        await expect(
            runGroundedLookupCall(
                {
                    grounding: throwing,
                    groundingTools: { web_search: fakeWebSearchTool },
                },
                BASE_ARGS
            )
        ).rejects.toThrow();

        expect(calls).toBe(1);
    });

    it("a confident, corroborated result reports usage and sources from the one call", async () => {
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD), {
            input: 5489,
            output: 85,
            sourceUrl: "https://farmatodo.com/about",
        });

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            BASE_ARGS
        );

        expect(outcome.candidate).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
            key: "farmatodo",
            tags: ["pharmacy"],
        });
        expect(outcome.sources).toStrictEqual([{ url: "https://farmatodo.com/about" }]);
        expect(outcome.inputTokens).toBe(5489);
        expect(outcome.outputTokens).toBe(85);
    });

    it("threads a region code into the prompt", async () => {
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD), {
            sourceUrl: "https://farmatodo.com/about",
        });

        await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            { ...BASE_ARGS, regionCode: "VE" }
        );

        const sent = JSON.stringify(grounding.doGenerateCalls[0]?.prompt);
        expect(sent).toContain("VE");
    });

    it("threads the purchase currency and the descriptor hint into the prompt", async () => {
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD), {
            sourceUrl: "https://farmatodo.com/about",
        });

        await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            { ...BASE_ARGS, currency: "EUR" }
        );

        const sent = JSON.stringify(grounding.doGenerateCalls[0]?.prompt);
        expect(sent).toContain("charged in EUR");
        expect(sent).toContain("card-terminal or bank-statement descriptor");
    });

    it("drops a non-url source rather than widening the candidate's source shape", async () => {
        const grounding = new MockLanguageModelV3({
            doGenerate: async () => ({
                content: [
                    { text: JSON.stringify(CONFIDENT_PAYLOAD), type: "text" },
                    {
                        id: "doc-1",
                        mediaType: "application/pdf",
                        sourceType: "document",
                        title: "not a url",
                        type: "source",
                    },
                ],
                finishReason: { raw: undefined, unified: "stop" },
                usage: usageStub(10, 5),
                warnings: [],
            }),
        });

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            BASE_ARGS
        );

        expect(outcome.sources).toStrictEqual([]);
    });
});

describe("runGroundedLookup guards (ADR-11 order)", () => {
    it("performs no model work when groundedPerKey is already exhausted for this key", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        await t.run((ctx) => rateLimiter.limit(ctx, "groundedPerKey", { key: "farmatodo" }));
        const grounding = mockTextModel("irrelevant");

        await t.action(async (ctx) =>
            runGroundedLookup(ctx, BASE_ARGS, {
                grounding,
                groundingTools: { web_search: fakeWebSearchTool },
            })
        );

        expect(grounding.doGenerateCalls).toHaveLength(0);
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
        const grounding = mockTextModel("irrelevant");

        await t.action(async (ctx) =>
            runGroundedLookup(ctx, BASE_ARGS, {
                grounding,
                groundingTools: { web_search: fakeWebSearchTool },
            })
        );

        expect(grounding.doGenerateCalls).toHaveLength(0);
        limitSpy.mockRestore();
    });

    it("a confident result writes merchantKnowledge and records spend as published", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD), {
            input: 130,
            output: 30,
            sourceUrl: "https://farmatodo.com/about",
        });

        await t.action(async (ctx) =>
            runGroundedLookup(ctx, BASE_ARGS, {
                grounding,
                groundingTools: { web_search: fakeWebSearchTool },
            })
        );

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
        const aborting = new MockLanguageModelV3({
            doGenerate: async () => {
                const abort = new Error("The operation was aborted");
                abort.name = "AbortError";
                throw abort;
            },
        });
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(
            t.action(async (ctx) =>
                runGroundedLookup(ctx, BASE_ARGS, {
                    grounding: aborting,
                    groundingTools: { web_search: fakeWebSearchTool },
                })
            )
        ).resolves.not.toThrow();

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
        const grounding = mockTextModel(JSON.stringify(CONFIDENT_PAYLOAD));

        await t.action(async (ctx) =>
            runGroundedLookup(ctx, BASE_ARGS, {
                grounding,
                groundingTools: { web_search: fakeWebSearchTool },
            })
        );

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
            const grounding = mockTextModel(JSON.stringify({ ...CONFIDENT_PAYLOAD, domain }), { sourceUrl });

            const outcome = await runGroundedLookupCall(
                { grounding, groundingTools: { web_search: fakeWebSearchTool } },
                BASE_ARGS
            );

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
        const grounding = mockTextModel(
            JSON.stringify({
                canonicalCategory: "Travel",
                categoryName: "Trips",
                domain: "care4bag.gr",
                domainConfidence: "high",
                emoji: null,
                merchantName: "Care4Bag",
                tags: ["luggage"],
            }),
            { sourceUrl: "https://www.care4bag.gr/" }
        );

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            TREE_ARGS
        );

        expect(outcome.answer).toStrictEqual({
            categoryName: "Trips",
            domain: "care4bag.gr",
            emoji: null,
            merchantName: "Care4Bag",
            tags: ["luggage"],
        });
        expect(outcome.candidate).toMatchObject({ categoryName: "Travel", merchantName: "Care4Bag" });
        expect(JSON.stringify(grounding.doGenerateCalls[0]?.prompt)).toContain("Trips");
    });

    it("keeps a guessed domain off the answer", async () => {
        const grounding = mockTextModel(
            JSON.stringify({
                canonicalCategory: "Travel",
                categoryName: "Trips",
                domain: "care4bag.com",
                domainConfidence: "low",
                merchantName: "Care4Bag",
                tags: [],
            })
        );

        const outcome = await runGroundedLookupCall(
            { grounding, groundingTools: { web_search: fakeWebSearchTool } },
            TREE_ARGS
        );

        expect(outcome.answer.domain).toBeNull();
    });
});

describe("grounded abort budget", () => {
    it("stays generous: a live grounded search measures ~3.75s+, and the old 3.5s budget aborted nearly every scheduled run", () => {
        expect(GROUNDED_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    });
});

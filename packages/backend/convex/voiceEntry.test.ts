/// <reference types="vite/client" />

import { getThreadMetadata, saveMessage } from "@convex-dev/agent";
import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { MockTranscriptionModelV4 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, components } from "./_generated/api";
import { captureLimiter, FREE_CAPTURE_CONFIG } from "./lib/captures";
import { namesWithinBudget } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { AI_CONSENT_VERSION } from "./lib/models";
import schema from "./schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";
import {
    buildPrompt,
    MAX_AUDIO_BYTES,
    normalizeDraft,
    normalizeQuotes,
    PROPOSE_DRAFT_TOOL,
    rateLimiter,
    transcribeClip,
} from "./voiceEntry";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function mockTranscriber(text: string) {
    return new MockTranscriptionModelV4({
        doGenerate: async () => ({
            durationInSeconds: 2,
            language: "en",
            response: { headers: {}, modelId: "mock", timestamp: new Date() },
            segments: [],
            text,
            warnings: [],
        }),
    });
}

const CLIP = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 77, 52, 65, 32]).buffer;

const BASE_ARGS = {
    accounts: ["Amex", "Checking"],
    categoryTree: [
        { children: ["Coffee"], name: "Food" },
        { children: [], name: "Groceries" },
    ],
    currency: "USD",
    today: "2026-09-03",
};

const MODEL_ANSWER = {
    accountName: "Amex",
    amount: 12.5,
    categoryName: "Coffee",
    currency: null,
    date: "2026-09-02",
    details: null,
    domain: "starbucks.com",
    found: true,
    kind: "expense" as const,
    merchant: "Starbucks",
    recurrence: null,
    toAccountName: null,
};

describe("namesWithinBudget", () => {
    it("bounds each name's length, a branch's children, and the total, not just the counts the args allow", () => {
        expect(namesWithinBudget(BASE_ARGS.categoryTree, BASE_ARGS.accounts)).toBeTruthy();
        expect(namesWithinBudget([{ children: [], name: "x".repeat(81) }], [])).toBeFalsy();
        expect(namesWithinBudget([], ["y".repeat(81)])).toBeFalsy();
        const wide = { children: Array.from({ length: 51 }, (_, i) => `c${i}`), name: "Wide" };
        expect(namesWithinBudget([wide], [])).toBeFalsy();
        const many = Array.from({ length: 150 }, (_, i) => ({ children: ["a", "b"], name: `p${i}` }));
        expect(namesWithinBudget(many, [])).toBeFalsy();
    });
});

describe("buildPrompt", () => {
    it("asks for one tool call per turn and frames corrections against the last draft", () => {
        const prompt = buildPrompt(BASE_ARGS);
        expect(prompt).toContain(`calling ${PROPOSE_DRAFT_TOOL} exactly once`);
        expect(prompt).toContain("correction");
        expect(prompt).toContain("Today is 2026-09-03 (Thursday)");
        expect(prompt).toContain("Food (containing Coffee); Groceries");
        expect(prompt).toContain("Amex, Checking");
    });
});

describe("normalizeQuotes", () => {
    it("keeps only phrases that are in the sentence, whatever their case, trimmed", () => {
        const sentence = "Gasté doce cincuenta en Starbucks ayer con la Visa";
        expect(
            normalizeQuotes(
                [
                    { field: "amount", text: " Doce cincuenta " },
                    { field: "merchant", text: "Starbucks Coffee" },
                    { field: "account", text: "la Visa" },
                    { field: "date", text: "" },
                    { field: "category", text: sentence.repeat(2) },
                ],
                sentence
            )
        ).toStrictEqual([
            { field: "amount", text: "Doce cincuenta" },
            { field: "account", text: "la Visa" },
        ]);
        expect(normalizeQuotes(undefined, sentence)).toStrictEqual([]);
    });
});

describe("normalizeDraft", () => {
    it("keeps a well-formed answer whole, including the spoken account and yesterday's date", () => {
        expect(normalizeDraft(MODEL_ANSWER, BASE_ARGS)).toStrictEqual({
            accountName: "Amex",
            amount: 12.5,
            categoryName: "Coffee",
            currency: null,
            date: "2026-09-02",
            details: null,
            domain: "starbucks.com",
            income: false,
            kind: "entry",
            merchant: "Starbucks",
            recurrence: null,
        });
    });

    it("a domain is kept as a bare host; a url is trimmed to one; junk is dropped; a transfer has none", () => {
        const at = (domain: string | null) => normalizeDraft({ ...MODEL_ANSWER, domain }, BASE_ARGS);
        expect(at("https://www.Carrefour.es/shop")).toMatchObject({ domain: "carrefour.es" });
        expect(at("mercadona")).toMatchObject({ domain: null });
        expect(at("not a host")).toMatchObject({ domain: null });
        const moved = { ...MODEL_ANSWER, kind: "transfer" as const, toAccountName: "Amex" };
        expect(normalizeDraft(moved, BASE_ARGS)).not.toHaveProperty("domain");
    });

    it("a spoken cadence is kept, its count rounded and clamped; a transfer never repeats", () => {
        const twoWeeks = { every: 2, unit: "week" as const };
        expect(normalizeDraft({ ...MODEL_ANSWER, recurrence: twoWeeks }, BASE_ARGS)).toMatchObject({
            recurrence: twoWeeks,
        });
        expect(normalizeDraft({ ...MODEL_ANSWER, recurrence: { every: 0.2, unit: "month" } }, BASE_ARGS)).toMatchObject(
            { recurrence: { every: 1, unit: "month" } }
        );
        const moved = { ...MODEL_ANSWER, kind: "transfer" as const, recurrence: twoWeeks, toAccountName: "Amex" };
        expect(normalizeDraft(moved, BASE_ARGS)).not.toHaveProperty("recurrence");
    });

    it("a transfer carries both account names and nothing a ledger row would need", () => {
        const answer = {
            ...MODEL_ANSWER,
            accountName: "checking",
            amount: 500,
            categoryName: "Coffee",
            kind: "transfer" as const,
            merchant: null,
            toAccountName: "Amex",
        };
        expect(normalizeDraft(answer, BASE_ARGS)).toStrictEqual({
            amount: 500,
            currency: null,
            date: "2026-09-02",
            details: null,
            fromAccountName: "Checking",
            kind: "transfer",
            toAccountName: "Amex",
        });
    });

    it("income is the kind, not a flag the model can leave unset", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, kind: "income" }, BASE_ARGS)).toMatchObject({
            income: true,
            kind: "entry",
        });
    });

    it("drops a category the ledger does not have, keeps an unknown account as spoken, and case-folds the known", () => {
        const answer = { ...MODEL_ANSWER, accountName: "Visa", categoryName: "groceries" };
        expect(normalizeDraft(answer, BASE_ARGS)).toMatchObject({ accountName: "Visa", categoryName: "Groceries" });
        expect(normalizeDraft({ ...MODEL_ANSWER, accountName: "amex" }, BASE_ARGS)).toMatchObject({
            accountName: "Amex",
        });
        expect(normalizeDraft({ ...MODEL_ANSWER, categoryName: "Toys" }, BASE_ARGS)).toMatchObject({
            categoryName: null,
        });
    });

    it("a date outside the window, not a date, or a day the calendar lacks becomes today", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2020-01-01" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-02-31" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-08-31" }, BASE_ARGS)?.date).toBe("2026-08-31");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-09-10" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "tomorrow" }, BASE_ARGS)?.date).toBe("2026-09-03");
    });

    it("the ledger's own currency reads as null; another code is kept upper-cased; junk is dropped", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "usd" }, BASE_ARGS)?.currency).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "eur" }, BASE_ARGS)?.currency).toBe("EUR");
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "dollars" }, BASE_ARGS)?.currency).toBeNull();
    });

    it("no amount, found:false, or an amount past the ledger's ceiling is null — the tool's word for unclear", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, amount: null }, BASE_ARGS)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, found: false }, BASE_ARGS)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, amount: -3 }, BASE_ARGS)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, amount: 10_000_000_000_000 }, BASE_ARGS)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, amount: 9_999_999_999_999 }, BASE_ARGS)).not.toBeNull();
    });
});

describe("transcribeClip", () => {
    it("hands back the trimmed transcript, and empty for silence", async () => {
        await expect(transcribeClip(mockTranscriber("  hello  "), CLIP, "en-US")).resolves.toStrictEqual({
            text: "hello",
        });
        await expect(transcribeClip(mockTranscriber("   "), CLIP, undefined)).resolves.toStrictEqual({
            error: "empty",
        });
    });

    it("passes the language to the provider as a bare language code", async () => {
        const seen: unknown[] = [];
        const model = new MockTranscriptionModelV4({
            doGenerate: async (options) => {
                seen.push(options.providerOptions);
                return {
                    durationInSeconds: 1,
                    language: "es",
                    response: { headers: {}, modelId: "mock", timestamp: new Date() },
                    segments: [],
                    text: "doce con cincuenta",
                    warnings: [],
                };
            },
        });
        await transcribeClip(model, CLIP, "es-VE");
        expect(seen).toStrictEqual([
            {
                elevenlabs: {
                    diarize: false,
                    languageCode: "es",
                    tagAudioEvents: false,
                    timestampsGranularity: "none",
                },
            },
        ]);
    });
});

describe("voice thread + speak guard ladder", () => {
    const ACTION_ARGS = {
        accounts: BASE_ARGS.accounts,
        aiConsent: AI_CONSENT_VERSION,
        audio: CLIP,
        categoryTree: BASE_ARGS.categoryTree,
        currency: "USD",
        language: "en-US",
        threadId: "not-a-thread",
        today: "2026-09-03",
    };

    function harness() {
        const t = convexTest(schema, modules);
        agentTest.register(t);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        return t;
    }

    it("a signed-out caller gets no thread and an unauthenticated speak", async () => {
        const t = harness();
        await expect(t.mutation(api.voiceEntry.startThread, {})).resolves.toStrictEqual({
            status: "unauthenticated",
            threadId: null,
        });
        await expect(t.action(api.voiceEntry.speak, ACTION_ARGS)).resolves.toStrictEqual({
            order: null,
            status: "unauthenticated",
            transcript: null,
        });
    });

    it("returns notConfigured when ANTHROPIC_API_KEY is unset, never throws", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = harness();
        const identity = await seedAuthUser(t);
        await expect(authenticatedAs(t, identity).action(api.voiceEntry.speak, ACTION_ARGS)).resolves.toMatchObject({
            status: "notConfigured",
        });
    });

    it("never sends a clip from a build that asked about other AI providers", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        const t = harness();
        const identity = await seedAuthUser(t);
        const { aiConsent: _consent, ...oldBuild } = ACTION_ARGS;

        await expect(authenticatedAs(t, identity).action(api.voiceEntry.speak, oldBuild)).resolves.toMatchObject({
            status: "notConfigured",
        });
    });

    it("returns invalid for an empty clip, an oversized clip, a malformed today, or a thread that is not the caller's", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        const t = harness();
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const own = { ...ACTION_ARGS, threadId };
        await expect(asUser.action(api.voiceEntry.speak, { ...own, audio: new ArrayBuffer(0) })).resolves.toMatchObject(
            { status: "invalid" }
        );
        await expect(
            asUser.action(api.voiceEntry.speak, { ...own, audio: new ArrayBuffer(MAX_AUDIO_BYTES + 1) })
        ).resolves.toMatchObject({ status: "invalid" });
        await expect(asUser.action(api.voiceEntry.speak, { ...own, today: "Sept 3" })).resolves.toMatchObject({
            status: "invalid",
        });
        await expect(
            asUser.action(api.voiceEntry.speak, { ...own, language: `en-${"x".repeat(200)}` })
        ).resolves.toMatchObject({ status: "invalid" });
        const stranger = authenticatedAs(t, await seedAuthUser(t, { email: "other@example.com" }));
        await expect(stranger.action(api.voiceEntry.speak, own)).resolves.toMatchObject({ status: "invalid" });
    });

    it("another person's thread reads as empty, and only its owner can end it", async () => {
        const t = harness();
        const owner = authenticatedAs(t, await seedAuthUser(t));
        const stranger = authenticatedAs(t, await seedAuthUser(t, { email: "other@example.com" }));
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const page = { cursor: null, numItems: 10 };
        const metadata = () =>
            t.run(async (ctx) => getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null));
        await expect(
            stranger.query(api.voiceEntry.listTurns, { paginationOpts: page, threadId })
        ).resolves.toMatchObject({ isDone: true, page: [] });
        await stranger.mutation(api.voiceEntry.endThread, { threadId });
        await expect(metadata()).resolves.toMatchObject({ userId: expect.any(String) });
        vi.useFakeTimers();
        await owner.mutation(api.voiceEntry.endThread, { threadId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(metadata()).resolves.toBeNull();
    });

    it("a thread the screen never ended expires on its own, and the same subject from another issuer is a stranger", async () => {
        const t = harness();
        const identity = await seedAuthUser(t);
        const owner = authenticatedAs(t, identity);
        // Installed before the thread opens: the scheduler arms its timer at `runAfter` time.
        vi.useFakeTimers();
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const page = { cursor: null, numItems: 10 };
        const impostor = t.withIdentity({ issuer: "https://elsewhere.example", subject: identity.subject });
        await expect(
            impostor.query(api.voiceEntry.listTurns, { paginationOpts: page, threadId })
        ).resolves.toMatchObject({ isDone: true, page: [] });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(
            t.run(async (ctx) => getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null))
        ).resolves.toBeNull();
    });

    it("a thread spoken into keeps living: the sweep moves out past the last turn, then deletes", async () => {
        const t = harness();
        const owner = authenticatedAs(t, await seedAuthUser(t));
        vi.useFakeTimers();
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const metadata = () =>
            t.run(async (ctx) => getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null));
        vi.advanceTimersByTime(30 * 60 * 1000);
        await t.run(async (ctx) => saveMessage(ctx, components.agent, { prompt: "twenty at netflix", threadId }));
        vi.advanceTimersByTime(31 * 60 * 1000);
        await t.finishInProgressScheduledFunctions();
        await expect(metadata()).resolves.toMatchObject({ userId: expect.any(String) });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(metadata()).resolves.toBeNull();
    });

    it("opening threads is metered too: an exhausted bucket answers rateLimited and creates nothing", async () => {
        const t = harness();
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        await t.run(async (ctx) =>
            rateLimiter.limit(ctx, "voiceThreadPerUser", {
                config: perUserBurst("voiceThread", false),
                count: perUserBurst("voiceThread", false).capacity,
                key: tokenIdentifier,
            })
        );
        await expect(asUser.mutation(api.voiceEntry.startThread, {})).resolves.toStrictEqual({
            status: "rateLimited",
            threadId: null,
        });
    });

    it("returns notEntitled once a free user's capture pool is spent", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        const t = harness();
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        await t.run((ctx) =>
            captureLimiter.limit(ctx, "capturesFree", {
                count: FREE_CAPTURE_CONFIG.rate,
                key: tokenIdentifier,
            })
        );
        await expect(asUser.action(api.voiceEntry.speak, { ...ACTION_ARGS, threadId })).resolves.toMatchObject({
            status: "notEntitled",
        });
    });

    it("returns rateLimited once the per-user bucket is exhausted", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        const t = harness();
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        await t.run(async (ctx) =>
            rateLimiter.limit(ctx, "voiceEntryPerUser", {
                config: perUserBurst("voiceEntry", false),
                count: perUserBurst("voiceEntry", false).capacity,
                key: tokenIdentifier,
            })
        );
        await expect(asUser.action(api.voiceEntry.speak, { ...ACTION_ARGS, threadId })).resolves.toMatchObject({
            status: "rateLimited",
        });
    });
});

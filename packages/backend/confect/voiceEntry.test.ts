/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { resolveTextModel } from "@outlayr/ai/model";
import type { SpeechModel } from "@outlayr/ai/speech";
import { answers, fails, fakeModel } from "@outlayr/ai/testing";
import type { FakeResponseStep } from "@outlayr/ai/testing";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { MAX_AUDIO_BYTES } from "./lib/captureArgs";
import { captureLimiter, FREE_CAPTURE_CONFIG } from "./lib/captures";
import { namesWithinBudget } from "./lib/ledgerPrompt";
import { fixedBurst, perUserBurst } from "./lib/limits";
import { runEdge } from "./lib/runEdge";
import { authenticatedAs, seedAuthUser } from "./test.helpers";
import {
    buildPrompt,
    DELETE_BATCH,
    ENDED_THREAD_GRACE_MS,
    normalizeDraft,
    normalizeQuotes,
    PROPOSE_DRAFT_TOOL,
    rateLimiter,
    THREAD_TTL_MS,
    transcribeClip,
} from "./voiceEntry";

vi.mock(import("@outlayr/ai/model"), async (importOriginal) => ({
    ...(await importOriginal()),
    resolveTextModel: vi.fn<typeof resolveTextModel>(),
}));

const modules = import.meta.glob("../convex/**/*.ts");

function stubModel(...responses: FakeResponseStep[]) {
    const fake = fakeModel(responses, { feature: "voice_entry", repeat: true });
    vi.mocked(resolveTextModel).mockImplementation((chosen) =>
        Effect.succeed(Option.some({ ...fake.model, route: chosen }))
    );
    return fake.requests;
}

beforeEach(() => {
    stubModel(fails("unexpected model call"));
});

function harness() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    return t;
}

type Harness = ReturnType<typeof harness>;

const threadRow = (t: Harness, threadId: string) =>
    t.run(async (ctx) => {
        const id = ctx.db.normalizeId("voiceThreads", threadId);
        return id === null ? null : await ctx.db.get(id);
    });

const turnCount = async (t: Harness) => (await t.run((ctx) => ctx.db.query("voiceTurns").collect())).length;

const sayInto = (t: Harness, threadId: string, said: string, turns = 1) =>
    t.run(async (ctx) => {
        const id = ctx.db.normalizeId("voiceThreads", threadId);
        if (id === null) {
            throw new Error("Expected a voice thread");
        }
        const first = (
            await ctx.db
                .query("voiceTurns")
                .withIndex("by_threadId_and_order", (q) => q.eq("threadId", id))
                .collect()
        ).length;
        for (let order = first; order < first + turns; order += 1) {
            await ctx.db.insert("voiceTurns", { order, said, threadId: id });
        }
    });

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function mockTranscriber(transcriber: SpeechModel["transcriber"]): SpeechModel {
    return { modelId: "mock", provider: "elevenlabs", realtime: Option.none(), transcriber };
}

const hearing = (text: string) => mockTranscriber(async () => ({ id: "mock", model: "mock", text }));

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
    it("asks for the whole draft every turn and frames corrections against the last draft", () => {
        const prompt = buildPrompt(BASE_ARGS);
        expect(prompt).toContain("complete draft for the latest sentence");
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
            parentCategoryName: null,
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

    it("keeps an unknown account as spoken and case-folds the known names", () => {
        const answer = { ...MODEL_ANSWER, accountName: "Visa", categoryName: "groceries" };
        expect(normalizeDraft(answer, BASE_ARGS)).toMatchObject({ accountName: "Visa", categoryName: "Groceries" });
        expect(normalizeDraft({ ...MODEL_ANSWER, accountName: "amex" }, BASE_ARGS)).toMatchObject({
            accountName: "Amex",
        });
    });

    it("proposes a new category with a new parent, and never nests under a subcategory", () => {
        const proposed = { ...MODEL_ANSWER, categoryName: "Car maintenance", parentCategoryName: "Vehicle" };
        expect(normalizeDraft(proposed, BASE_ARGS)).toMatchObject({
            categoryName: "Car maintenance",
            parentCategoryName: "Vehicle",
        });
        const underKnown = { ...MODEL_ANSWER, categoryName: "Toys", parentCategoryName: "food" };
        expect(normalizeDraft(underKnown, BASE_ARGS)).toMatchObject({
            categoryName: "Toys",
            parentCategoryName: "Food",
        });
        const underChild = { ...MODEL_ANSWER, categoryName: "Toys", parentCategoryName: "Coffee" };
        expect(normalizeDraft(underChild, BASE_ARGS)).toMatchObject({ parentCategoryName: null });
    });

    it("a date outside the window, not a date, or a day the calendar lacks becomes today", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2020-01-01" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-02-31" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-08-31" }, BASE_ARGS)?.date).toBe("2026-08-31");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-09-10" }, BASE_ARGS)?.date).toBe("2026-09-03");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "tomorrow" }, BASE_ARGS)?.date).toBe("2026-09-03");
    });

    it("the ledger's own currency reads as null; a catalog code is kept upper-cased; junk and unknown codes are dropped", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "usd" }, BASE_ARGS)?.currency).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "eur" }, BASE_ARGS)?.currency).toBe("EUR");
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "dollars" }, BASE_ARGS)?.currency).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "rmb" }, BASE_ARGS)?.currency).toBeNull();
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
    it("hands back the trimmed transcript, empty for silence, and provider for a failed call", async () => {
        await expect(Effect.runPromise(transcribeClip(hearing("  hello  "), CLIP, "en-US"))).resolves.toStrictEqual({
            text: "hello",
        });
        await expect(Effect.runPromise(transcribeClip(hearing("   "), CLIP, undefined))).resolves.toStrictEqual({
            error: "empty",
        });
        const failing = mockTranscriber(async () => {
            throw new Error("down");
        });
        await expect(Effect.runPromise(transcribeClip(failing, CLIP, undefined))).resolves.toStrictEqual({
            error: "provider",
        });
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

    it("a signed-out caller gets no thread", async () => {
        const t = harness();
        await expect(t.mutation(api.voiceEntry.startThread, {})).resolves.toStrictEqual({
            status: "unauthenticated",
            threadId: null,
        });
    });

    it("returns notConfigured when only the transcription key is unset, never throws", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "");
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
        const metadata = () => threadRow(t, threadId);
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
        const impostor = t.withIdentity({
            issuer: "https://elsewhere.example",
            sessionId: identity.sessionId,
            subject: identity.subject,
        });
        await expect(
            impostor.query(api.voiceEntry.listTurns, { paginationOpts: page, threadId })
        ).resolves.toMatchObject({ isDone: true, page: [] });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(threadRow(t, threadId)).resolves.toBeNull();
    });

    it("a thread spoken into keeps living: the sweep moves out past the last turn, then deletes", async () => {
        const t = harness();
        const owner = authenticatedAs(t, await seedAuthUser(t));
        vi.useFakeTimers();
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const metadata = () => threadRow(t, threadId);
        vi.advanceTimersByTime(30 * 60 * 1000);
        await sayInto(t, threadId, "twenty at netflix");
        vi.advanceTimersByTime(31 * 60 * 1000);
        await t.finishInProgressScheduledFunctions();
        await expect(metadata()).resolves.toMatchObject({ userId: expect.any(String) });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(metadata()).resolves.toBeNull();
        await expect(turnCount(t)).resolves.toBe(0);
    });

    it("a thread with more turns than one mutation may delete is still swept whole", async () => {
        const t = harness();
        const owner = authenticatedAs(t, await seedAuthUser(t));
        vi.useFakeTimers();
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        await sayInto(t, threadId, "twenty at netflix", DELETE_BATCH * 2 + 1);
        await owner.mutation(api.voiceEntry.endThread, { threadId });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();
        await expect(threadRow(t, threadId)).resolves.toBeNull();
        await expect(turnCount(t)).resolves.toBe(0);
    });

    it("closing the screen mid-turn leaves the thread to the turn still landing, then deletes it", async () => {
        const t = harness();
        const owner = authenticatedAs(t, await seedAuthUser(t));
        vi.useFakeTimers();
        const { threadId } = await owner.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const metadata = () => threadRow(t, threadId);
        await owner.mutation(api.voiceEntry.endThread, { threadId });
        vi.advanceTimersByTime(15_000);
        await t.finishInProgressScheduledFunctions();
        await sayInto(t, threadId, "twenty at netflix");
        vi.advanceTimersByTime(ENDED_THREAD_GRACE_MS - 15_000);
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
                config: fixedBurst("voiceThread", false),
                count: fixedBurst("voiceThread", false).capacity,
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
        const burst = await runEdge(perUserBurst("voiceEntry", false));
        await t.run(async (ctx) =>
            rateLimiter.limit(ctx, "voiceEntryPerUser", {
                config: burst,
                count: burst.capacity,
                key: tokenIdentifier,
            })
        );
        await expect(asUser.action(api.voiceEntry.speak, { ...ACTION_ARGS, threadId })).resolves.toMatchObject({
            status: "rateLimited",
        });
    });
});

describe("openStream + speakText credits", () => {
    const TEXT_ARGS = {
        accounts: BASE_ARGS.accounts,
        aiConsent: AI_CONSENT_VERSION,
        categoryTree: BASE_ARGS.categoryTree,
        currency: "USD",
        language: "en-US",
        today: "2026-09-03",
        transcript: "twelve fifty at Starbucks",
    };

    function stubProviders() {
        const scribeCalls: (string | null)[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
                if (String(input).includes("elevenlabs.io/v1/single-use-token/realtime_scribe")) {
                    scribeCalls.push(new Headers(init?.headers).get("xi-api-key"));
                    return Response.json({ token: "sut_test" });
                }
                return new Response("down", { status: 500 });
            })
        );
        return scribeCalls;
    }

    async function signedIn() {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        const t = harness();
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        return { asUser, t, threadId };
    }

    it("speakText refuses a thread that no openStream admitted", async () => {
        stubProviders();
        const { asUser, threadId } = await signedIn();
        await expect(asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId })).resolves.toMatchObject({
            order: null,
            status: "invalid",
        });
    });

    it("one openStream pays for exactly one speakText, and the token request carries the key", async () => {
        const scribeCalls = stubProviders();
        const { asUser, threadId } = await signedIn();
        await expect(
            asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId })
        ).resolves.toStrictEqual({
            session: { kind: "elevenlabs", model: "scribe_v3_live", token: "sut_test" },
            status: "ok",
            token: "sut_test",
        });
        expect(scribeCalls).toStrictEqual(["test-elevenlabs-key"]);

        const first = await asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId });
        expect(first.status).not.toBe("invalid");
        await expect(asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId })).resolves.toMatchObject({
            status: "invalid",
        });
    });

    it("a fresh credit still pays on a thread holding twenty stale ones", async () => {
        stubProviders();
        const { asUser, t, threadId } = await signedIn();
        vi.useFakeTimers();
        await t.run(async (ctx) => {
            for (let credit = 0; credit < 20; credit += 1) {
                await ctx.db.insert("voiceStreamCredits", { threadId });
            }
        });
        vi.advanceTimersByTime(THREAD_TTL_MS + 1);
        await asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId });
        const spoken = await asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId });
        vi.useRealTimers();
        expect(spoken.status).not.toBe("invalid");
    });

    it("an empty transcript is unclear and keeps the credit", async () => {
        stubProviders();
        const { asUser, t, threadId } = await signedIn();
        await asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId });
        await expect(
            asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId, transcript: "   " })
        ).resolves.toMatchObject({ status: "unclear" });
        await expect(t.run((ctx) => ctx.db.query("voiceStreamCredits").collect())).resolves.toHaveLength(1);
    });

    it("an over-long transcript is invalid", async () => {
        stubProviders();
        const { asUser, threadId } = await signedIn();
        await asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId });
        await expect(
            asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId, transcript: "a".repeat(1001) })
        ).resolves.toMatchObject({ status: "invalid" });
    });

    it("openStream refuses without calling ElevenLabs once the free capture pool is spent", async () => {
        const scribeCalls = stubProviders();
        const { asUser, t, threadId } = await signedIn();
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        await t.run((ctx) =>
            captureLimiter.limit(ctx, "capturesFree", { count: FREE_CAPTURE_CONFIG.rate, key: tokenIdentifier })
        );
        await expect(
            asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId })
        ).resolves.toStrictEqual({ session: null, status: "notEntitled", token: null });
        expect(scribeCalls).toHaveLength(0);
    });

    it("a provider failure on the token request is providerError", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("no", { status: 401 }))
        );
        const { asUser, threadId } = await signedIn();
        await expect(
            asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId })
        ).resolves.toStrictEqual({ session: null, status: "providerError", token: null });
    });

    it("a provider without realtime answers clip, counting nothing and granting no credit", async () => {
        const scribeCalls = stubProviders();
        const { asUser, t, threadId } = await signedIn();
        vi.stubEnv("STT_PROVIDER", "groq");
        vi.stubEnv("GROQ_API_KEY", "test-groq-key");
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        await t.run((ctx) =>
            captureLimiter.limit(ctx, "capturesFree", { count: FREE_CAPTURE_CONFIG.rate, key: tokenIdentifier })
        );
        await expect(
            asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId })
        ).resolves.toStrictEqual({ session: { kind: "clip" }, status: "ok", token: null });
        expect(scribeCalls).toHaveLength(0);
        await expect(asUser.action(api.voiceEntry.speakText, { ...TEXT_ARGS, threadId })).resolves.toMatchObject({
            status: "invalid",
        });
    });
});

describe("a voice turn", () => {
    const TURN_ARGS = {
        accounts: BASE_ARGS.accounts,
        aiConsent: AI_CONSENT_VERSION,
        categoryTree: BASE_ARGS.categoryTree,
        currency: "USD",
        language: "en-US",
        today: "2026-09-03",
    };

    async function speaking() {
        vi.stubEnv("ELEVENLABS_API_KEY", "test-elevenlabs-key");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({ token: "sut_test" }))
        );
        const t = harness();
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread for a signed-in caller");
        }
        const say = async (transcript: string) => {
            await asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId });
            return asUser.action(api.voiceEntry.speakText, { ...TURN_ARGS, threadId, transcript });
        };
        return { asUser, say, threadId };
    }

    it("stores the draft, hands it back as context for a correction, and the screen reads both turns", async () => {
        const requests = stubModel(answers(MODEL_ANSWER), answers({ ...MODEL_ANSWER, amount: 15 }));
        const { asUser, say, threadId } = await speaking();

        await expect(say("twelve fifty at Starbucks")).resolves.toMatchObject({ order: 0, status: "ok" });
        await expect(say("no, fifteen")).resolves.toMatchObject({ order: 1, status: "ok" });

        expect(requests[1]?.messages).toStrictEqual([
            { content: "twelve fifty at Starbucks", role: "user" },
            { content: JSON.stringify(MODEL_ANSWER), role: "assistant" },
            { content: "no, fifteen", role: "user" },
        ]);
        const turns = await asUser.query(api.voiceEntry.turns, { threadId });
        expect(turns.map((turn) => [turn.order, turn.said, turn.proposed?.draft?.amount])).toStrictEqual([
            [0, "twelve fifty at Starbucks", 12.5],
            [1, "no, fifteen", 15],
        ]);
        expect(turns[0]?.proposed?.draft).toMatchObject({ accountName: "Amex", kind: "entry", merchant: "Starbucks" });
    });

    it("a failed model call is providerError, and its sentence never reaches the next turn as context", async () => {
        const requests = stubModel(fails("overloaded"), answers(MODEL_ANSWER));
        const { asUser, say, threadId } = await speaking();

        await expect(say("twelve fifty at Starbucks")).resolves.toMatchObject({ status: "providerError" });
        await expect(asUser.query(api.voiceEntry.turns, { threadId })).resolves.toMatchObject([{ proposed: null }]);
        await say("twelve fifty at Starbucks");
        expect(requests[1]?.messages).toStrictEqual([{ content: "twelve fifty at Starbucks", role: "user" }]);
    });

    it("listTurns still answers a pre-#647 build in the agent's UIMessage shape, with empty streams", async () => {
        stubModel(answers(MODEL_ANSWER));
        const { asUser, say, threadId } = await speaking();
        await say("twelve fifty at Starbucks");
        const paginationOpts = { cursor: null, numItems: 10 };

        const listed = await asUser.query(api.voiceEntry.listTurns, {
            paginationOpts,
            streamArgs: { kind: "list", startOrder: 0 },
            threadId,
        });
        expect(listed.streams).toStrictEqual({ kind: "list", messages: [] });
        expect(listed.page).toMatchObject([
            { order: 0, role: "user", stepOrder: 0, text: "twelve fifty at Starbucks" },
            {
                order: 0,
                parts: [
                    {
                        output: { draft: { amount: 12.5, merchant: "Starbucks" } },
                        state: "output-available",
                        type: `tool-${PROPOSE_DRAFT_TOOL}`,
                    },
                ],
                role: "assistant",
                stepOrder: 1,
            },
        ]);
        await expect(
            asUser.query(api.voiceEntry.listTurns, {
                paginationOpts,
                streamArgs: { cursors: [], kind: "deltas" },
                threadId,
            })
        ).resolves.toMatchObject({ streams: { deltas: [], kind: "deltas" } });
    });

    it("an agent thread id from before the move is invalid, so the old build opens a fresh thread", async () => {
        const { asUser } = await speaking();
        const agentThreadId = "m57abc123def456ghi789jkl0mn1pq2r";
        await expect(
            asUser.action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId: agentThreadId })
        ).resolves.toMatchObject({ status: "invalid" });
        await expect(
            asUser.action(api.voiceEntry.speak, { ...TURN_ARGS, audio: CLIP, threadId: agentThreadId })
        ).resolves.toMatchObject({ status: "invalid" });
    });
});

/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { MockLanguageModelV4 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import {
    EMPTY,
    GROUNDED_REQUEST_TIMEOUT_MS,
    maybeScheduleGrounded,
    needsGroundedLookup,
    rateLimiter,
    runSuggest,
    sanitizeDomain,
    sanitizeCurrencyCode,
    sanitizeRegionCode,
    suggestArgs,
} from "./enrichment";
import { perUserBurst } from "./lib/limits";
import { knowledgeKey, merchantKey } from "./lib/merchantKey";
import { AI_CONSENT_VERSION } from "./lib/models";
import schema from "./schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    // Undoes a test's `mockImplementation` on the shared `rateLimiter` singleton.
    vi.restoreAllMocks();
});

/** `Output.object` parses text as JSON, so a mock returns the payload as one text part. */
function mockModel(payload: unknown) {
    return new MockLanguageModelV4({
        doGenerate: async () => ({
            content: [{ text: JSON.stringify(payload), type: "text" }],
            finishReason: { raw: undefined, unified: "stop" },
            usage: {
                inputTokens: {
                    cacheRead: undefined,
                    cacheWrite: undefined,
                    noCache: undefined,
                    total: undefined,
                },
                outputTokens: {
                    reasoning: undefined,
                    text: undefined,
                    total: undefined,
                },
            },
            warnings: [],
        }),
    });
}

const BASE_ARGS = {
    aiConsent: AI_CONSENT_VERSION,
    categoryTree: [
        { children: [], name: "Entertainment" },
        { children: ["Supermarket"], name: "Groceries" },
    ],
    groundedLookup: false,
    income: false,
    name: "netflix",
};

describe("suggest args validation", () => {
    it("carries exactly the privacy-boundary fields", () => {
        // A threat-matrix assertion: amounts, dates, accounts, balances and identity never leave the device.
        expect(Object.keys(suggestArgs).sort()).toStrictEqual(
            [
                "aiConsent",
                "background",
                "categoryTree",
                "currency",
                "groundedLookup",
                "income",
                "knowledgeOnly",
                "locale",
                "name",
                "regionCode",
            ].sort()
        );
    });
});

describe("suggest guard ladder", () => {
    it("returns EMPTY for a signed-out caller", async () => {
        const t = convexTest(schema, modules);

        await expect(t.action(api.enrichment.suggest, BASE_ARGS)).resolves.toStrictEqual(EMPTY);
    });

    it("returns EMPTY when ANTHROPIC_API_KEY is unset", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(authenticatedAs(t, identity).action(api.enrichment.suggest, BASE_ARGS)).resolves.toStrictEqual(
            EMPTY
        );
    });

    it("never sends a name from a build that asked about other AI providers", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const outbound = vi.fn<typeof fetch>();
        vi.stubGlobal("fetch", outbound);
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const { aiConsent: _consent, ...oldBuild } = BASE_ARGS;

        await expect(authenticatedAs(t, identity).action(api.enrichment.suggest, oldBuild)).resolves.toStrictEqual(
            EMPTY
        );
        expect(outbound).not.toHaveBeenCalled();
    });

    it("returns EMPTY for a name shorter than 3 trimmed characters", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                name: " hi ",
            })
        ).resolves.toStrictEqual(EMPTY);
    });

    it("returns EMPTY for a name longer than 64 trimmed characters", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                name: "a".repeat(65),
            })
        ).resolves.toStrictEqual(EMPTY);
    });

    it("returns EMPTY and never throws once the per-user bucket is exhausted", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }

        await t.run(async (ctx) =>
            rateLimiter.limit(ctx, "enrichmentPerUser", {
                count: perUserBurst("enrichment", false).capacity,
                key: tokenIdentifier,
            })
        );

        await expect(asUser.action(api.enrichment.suggest, BASE_ARGS)).resolves.toStrictEqual(EMPTY);
    });

    it("returns EMPTY and never throws once the global window is exhausted", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        // The global limit is sharded and sampled, so this only asserts a not-ok result short-circuits.
        const limitSpy = vi
            .spyOn(rateLimiter, "limit")
            .mockImplementation(async (_ctx, name) =>
                name === "enrichmentGlobal" ? { ok: false, retryAfter: 1000 } : { ok: true, retryAfter: undefined }
            );

        await expect(authenticatedAs(t, identity).action(api.enrichment.suggest, BASE_ARGS)).resolves.toStrictEqual(
            EMPTY
        );
        expect(limitSpy).toHaveBeenCalledWith(expect.anything(), "enrichmentGlobal");
    });

    it("a background lookup draws its own bucket, not the form's", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const limitSpy = vi.spyOn(rateLimiter, "limit").mockResolvedValue({ ok: false, retryAfter: 1000 });

        await authenticatedAs(t, identity).action(api.enrichment.suggest, { ...BASE_ARGS, background: true });

        expect(limitSpy).toHaveBeenCalledWith(expect.anything(), "enrichmentBackground", expect.anything());
        expect(limitSpy).not.toHaveBeenCalledWith(expect.anything(), "enrichmentPerUser", expect.anything());
    });
});

describe("merchantKnowledge cache (Tier 1.5)", () => {
    async function seedKnowledge(t: ReturnType<typeof convexTest>, name: string) {
        await t.run((ctx) =>
            ctx.db.insert("merchantKnowledge", {
                categoryName: "Healthcare",
                domain: "farmatodo.com",
                emoji: "💊",
                key: merchantKey(name),
                modelId: "test-model",
                parentCategoryName: null,
                resolvedAt: Date.now(),
                tags: ["pharmacy"],
            })
        );
    }

    it("a currency-scoped request reads its own partition, never the bare one", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await seedKnowledge(t, "Sushi Way");

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                currency: "EUR",
                name: "Sushi Way",
            })
        ).resolves.toStrictEqual(EMPTY);

        await t.run((ctx) =>
            ctx.db.insert("merchantKnowledge", {
                categoryName: "Dining Out",
                domain: "sushiway.fr",
                emoji: null,
                key: `${merchantKey("Sushi Way")}|eur`,
                modelId: "test-model",
                parentCategoryName: null,
                resolvedAt: Date.now(),
                tags: [],
            })
        );

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                currency: "EUR",
                name: "Sushi Way",
            })
        ).resolves.toMatchObject({ domain: "sushiway.fr" });
    });

    it("a new descriptor for a known merchant is answered from the cache, with no model configured", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await t.run((ctx) =>
            ctx.db.insert("merchantKnowledge", {
                categoryName: "Travel",
                domain: "airbnb.com",
                emoji: null,
                key: "airbnb|eur",
                merchantName: "Airbnb",
                modelId: "test-model",
                parentCategoryName: null,
                resolvedAt: Date.now(),
                tags: ["lodging"],
            })
        );

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                currency: "EUR",
                name: "AIRBNB * ZX81KQ7",
            })
        ).resolves.toMatchObject({ domain: "airbnb.com", merchantName: "Airbnb" });
    });

    it("a cache hit serves category, tags and domain without consuming either rate-limit bucket", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await seedKnowledge(t, "Farmatodo");
        const limitSpy = vi.spyOn(rateLimiter, "limit");

        const result = await authenticatedAs(t, identity).action(api.enrichment.suggest, {
            ...BASE_ARGS,
            name: "Farmatodo",
        });

        expect(result).toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
            emoji: "💊",
            grounding: false,
            tags: ["pharmacy"],
        });
        expect(limitSpy).not.toHaveBeenCalled();
    });

    it("case, diacritic and whitespace variants collide to the same cached key", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await seedKnowledge(t, "Farmatodo");
        const asUser = authenticatedAs(t, identity);

        await expect(
            asUser.action(api.enrichment.suggest, {
                ...BASE_ARGS,
                name: " FARMÁTODO ",
            })
        ).resolves.toMatchObject({ categoryName: "Healthcare" });
    });

    it("a knowledgeOnly hit serves the cached row exactly like an ordinary hit", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await seedKnowledge(t, "Farmatodo");

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                knowledgeOnly: true,
                name: "Farmatodo",
            })
        ).resolves.toMatchObject({
            categoryName: "Healthcare",
            domain: "farmatodo.com",
            grounding: false,
        });
    });

    it("a knowledgeOnly miss returns EMPTY without consuming a rate limit or the model", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const limitSpy = vi.spyOn(rateLimiter, "limit");

        await expect(
            authenticatedAs(t, identity).action(api.enrichment.suggest, {
                ...BASE_ARGS,
                knowledgeOnly: true,
                name: "totally unknown merchant xyz",
            })
        ).resolves.toStrictEqual(EMPTY);
        expect(limitSpy).not.toHaveBeenCalled();
    });
});

describe("latency/retry regression guard (task 3.13)", () => {
    it("runSuggest never retries a thrown provider error (maxRetries: 0)", async () => {
        let calls = 0;
        const throwing = new MockLanguageModelV4({
            doGenerate: async () => {
                calls += 1;
                throw new Error("network down");
            },
        });

        await expect(runSuggest(throwing, BASE_ARGS)).rejects.toThrow();
        expect(calls).toBe(1);
    });
});

describe(needsGroundedLookup, () => {
    it("a confident category with no domain still needs one", () => {
        expect(needsGroundedLookup({ categoryName: "Groceries", domain: null })).toBeTruthy();
    });

    it("a missing category needs one", () => {
        expect(needsGroundedLookup({ categoryName: null, domain: "gama.com" })).toBeTruthy();
    });

    it("a complete answer needs none", () => {
        expect(needsGroundedLookup({ categoryName: "Groceries", domain: "gama.com" })).toBeFalsy();
    });
});

describe(maybeScheduleGrounded, () => {
    async function scheduledGroundedRuns(t: ReturnType<typeof convexTest>) {
        const rows = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        return rows.filter((row) => row.name.includes("groundedLookup"));
    }

    /** `authenticatedAs` widens to `AnyTestConvex`; `t.withIdentity` keeps this file's `DataModel`. */
    function asIdentity(t: ReturnType<typeof convexTest>, identity: Awaited<ReturnType<typeof seedAuthUser>>) {
        return t.withIdentity({
            sessionId: identity.sessionId,
            subject: identity.subject,
        });
    }

    it("does not schedule when the client arg is false", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-a", {
                groundedLookup: false,
                income: false,
                name: "Farmatodo",
            })
        );

        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(0);
    });

    it("does not schedule when the synced appMeta row is false despite a true arg", async () => {
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        await t.run((ctx) =>
            ctx.db.insert("appMeta", {
                deviceId: "test-device",
                key: "groundedLookup",
                seq: 1,
                updatedAt: Date.now(),
                userId: identity.userId,
                value: "false",
            })
        );

        await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-b", {
                groundedLookup: true,
                income: false,
                name: "Farmatodo",
            })
        );

        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(0);
    });

    it("schedules when the arg is true and no appMeta row exists", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);

        const scheduled = await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-c", {
                groundedLookup: true,
                income: false,
                name: "Farmatodo",
            })
        );

        expect(scheduled).toBeTruthy();
        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(1);
    });

    async function afterLookupStarted(elapsedMs: number) {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-09-23T20:00:00Z"));
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        await t.run((ctx) => rateLimiter.limit(ctx, "groundedPerKey", { key: knowledgeKey("Farmatodo", "USD") }));
        vi.setSystemTime(new Date(Date.now() + elapsedMs));

        const reported = await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-g", {
                currency: "USD",
                groundedLookup: true,
                income: false,
                name: "Farmatodo",
            })
        );
        const perUser = await t.run((ctx) => rateLimiter.check(ctx, "groundedPerUser", { key: "token-g" }));
        const runs = await scheduledGroundedRuns(t);
        return { perUser, reported, runs };
    }

    it("reports a lookup for this merchant that is still running, without scheduling another", async () => {
        const { perUser, reported, runs } = await afterLookupStarted(5000);

        expect(reported).toBeTruthy();
        expect(runs).toHaveLength(0);
        expect(perUser.ok).toBeTruthy();
    });

    it("reports nothing, and spends nothing, once today's lookup for this merchant has finished", async () => {
        const { perUser, reported, runs } = await afterLookupStarted(GROUNDED_REQUEST_TIMEOUT_MS + 1000);

        expect(reported).toBeFalsy();
        expect(runs).toHaveLength(0);
        expect(perUser.ok).toBeTruthy();
    });

    it("the scheduled args never carry categoryTree (ADR-7)", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);

        await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-d", {
                groundedLookup: true,
                income: false,
                locale: "es-VE",
                name: "Farmatodo",
            })
        );

        const [row] = await scheduledGroundedRuns(t);
        const scheduledArgs = row.args[0] as Record<string, unknown>;
        expect(scheduledArgs).not.toHaveProperty("categoryTree");
        expect(scheduledArgs).toStrictEqual({
            income: false,
            key: merchantKey("Farmatodo"),
            locale: "es-VE",
            name: "Farmatodo",
        });
    });

    it("returns false instead of throwing when the session no longer resolves to a user", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);

        const stale = t.withIdentity({
            sessionId: "session-that-was-revoked",
            subject: identity.subject,
        });

        await expect(
            stale.run((ctx) =>
                maybeScheduleGrounded(ctx, "token-f", {
                    groundedLookup: true,
                    income: false,
                    name: "Farmatodo",
                })
            )
        ).resolves.toBeFalsy();
        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(0);
    });

    it("the scheduled args thread a region code through to groundedLookup.run", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);

        await asIdentity(t, identity).run((ctx) =>
            maybeScheduleGrounded(ctx, "token-e", {
                groundedLookup: true,
                income: false,
                name: "Farmatodo",
                regionCode: "VE",
            })
        );

        const [row] = await scheduledGroundedRuns(t);
        const scheduledArgs = row.args[0] as Record<string, unknown>;
        expect(scheduledArgs.regionCode).toBe("VE");
    });
});

describe("runSuggest sanitisation", () => {
    it("trims category name, tags and domain from well-formed model output", async () => {
        const model = mockModel({
            brand: "  Netflix  ",
            categoryName: "  Streaming  ",
            domain: "  netflix.com  ",
            domainConfidence: "high",
            isNewCategory: true,
            tags: ["  Music  ", "Streaming"],
        });

        await expect(runSuggest(model, { ...BASE_ARGS, categoryTree: [] })).resolves.toStrictEqual({
            categoryName: "Streaming",
            domain: "netflix.com",
            emoji: null,
            grounding: false,
            isNewCategory: true,
            merchantName: "Netflix",
            parentCategoryName: null,
            tags: ["Music", "Streaming"],
        });
    });

    it("drops empty tags and caps the rest at 3 entries of 24 characters", async () => {
        const model = mockModel({
            categoryName: null,
            domain: null,
            isNewCategory: false,
            tags: ["", "  ", "a".repeat(30), "second", "third", "fourth"],
        });

        const result = await runSuggest(model, {
            ...BASE_ARGS,
            categoryTree: [],
        });

        expect(result.tags).toStrictEqual(["a".repeat(24), "second", "third"]);
    });

    it("drops a domain rated medium, so the grounded tier is asked instead", async () => {
        const model = mockModel({
            categoryName: "Dining Out",
            domain: "bucasangiovanni.com",
            domainConfidence: "medium",
            isNewCategory: false,
            tags: [],
        });

        await expect(runSuggest(model, { ...BASE_ARGS, categoryTree: [] })).resolves.toMatchObject({
            categoryName: "Dining Out",
            domain: null,
        });
    });

    it("nulls out an empty category name", async () => {
        const model = mockModel({
            categoryName: "   ",
            domain: null,
            isNewCategory: false,
            tags: [],
        });

        await expect(runSuggest(model, { ...BASE_ARGS, categoryTree: [] })).resolves.toMatchObject({
            categoryName: null,
        });
    });

    it("nulls out a category name longer than 40 characters", async () => {
        const model = mockModel({
            categoryName: "a".repeat(41),
            domain: null,
            isNewCategory: false,
            tags: [],
        });

        await expect(runSuggest(model, { ...BASE_ARGS, categoryTree: [] })).resolves.toMatchObject({
            categoryName: null,
        });
    });

    it("recomputes isNewCategory as true when the model discards it but the name is unknown", async () => {
        const model = mockModel({
            categoryName: "Pets",
            domain: null,
            isNewCategory: false,
            tags: [],
        });

        await expect(
            runSuggest(model, {
                ...BASE_ARGS,
                categoryTree: [
                    { children: [], name: "Entertainment" },
                    { children: [], name: "Groceries" },
                ],
            })
        ).resolves.toMatchObject({ categoryName: "Pets", isNewCategory: true });
    });

    it("recomputes isNewCategory as false when the model claims new but the name is already known", async () => {
        const model = mockModel({
            categoryName: "Entertainment",
            domain: null,
            isNewCategory: true,
            tags: [],
        });

        await expect(
            runSuggest(model, {
                ...BASE_ARGS,
                categoryTree: [
                    { children: [], name: "Entertainment" },
                    { children: [], name: "Groceries" },
                ],
            })
        ).resolves.toMatchObject({
            categoryName: "Entertainment",
            isNewCategory: false,
        });
    });

    it("caps the category tree at 60 branches for the isNewCategory check", async () => {
        const categoryTree = Array.from({ length: 61 }, (_, i) => ({
            children: [],
            name: `Cat${i}`,
        }));
        // The 61st branch is past the server-side cap, so it reads as new.
        const model = mockModel({
            categoryName: "Cat60",
            domain: null,
            emoji: null,
            isNewCategory: false,
            parentCategoryName: null,
            tags: [],
        });

        await expect(runSuggest(model, { ...BASE_ARGS, categoryTree })).resolves.toMatchObject({
            categoryName: "Cat60",
            isNewCategory: true,
        });
    });

    it("keeps a parent the user actually has, for a category being created", async () => {
        const model = mockModel({
            categoryName: "Streaming",
            domain: null,
            emoji: "📺",
            isNewCategory: true,
            parentCategoryName: "Entertainment",
            tags: [],
        });

        await expect(runSuggest(model, BASE_ARGS)).resolves.toMatchObject({
            categoryName: "Streaming",
            emoji: "📺",
            isNewCategory: true,
            parentCategoryName: "Entertainment",
        });
    });

    it("drops a parent the user does not have", async () => {
        const model = mockModel({
            categoryName: "Streaming",
            domain: null,
            emoji: null,
            isNewCategory: true,
            parentCategoryName: "Invented Parent",
            tags: [],
        });

        await expect(runSuggest(model, BASE_ARGS)).resolves.toMatchObject({
            parentCategoryName: null,
        });
    });

    it("drops a parent when the category already exists", async () => {
        const model = mockModel({
            categoryName: "Entertainment",
            domain: null,
            emoji: null,
            isNewCategory: true,
            parentCategoryName: "Groceries",
            tags: [],
        });

        await expect(runSuggest(model, BASE_ARGS)).resolves.toMatchObject({
            isNewCategory: false,
            parentCategoryName: null,
        });
    });

    it("rejects an emoji field that is really a sentence", async () => {
        const model = mockModel({
            categoryName: "Streaming",
            domain: null,
            emoji: "a television set",
            isNewCategory: true,
            parentCategoryName: null,
            tags: [],
        });

        await expect(runSuggest(model, BASE_ARGS)).resolves.toMatchObject({
            emoji: null,
        });
    });
});

describe("runSuggest regionCode", () => {
    it("threads a region code into the model prompt", async () => {
        const model = mockModel({
            categoryName: null,
            domain: null,
            isNewCategory: false,
            tags: [],
        });

        await runSuggest(model, {
            ...BASE_ARGS,
            categoryTree: [],
            regionCode: "VE",
        });

        const sent = JSON.stringify(model.doGenerateCalls[0]?.prompt);
        expect(sent).toContain("VE");
    });

    it("threads the purchase currency into the prompt", async () => {
        const model = mockModel({
            categoryName: null,
            domain: null,
            isNewCategory: false,
            tags: [],
        });

        await runSuggest(model, { ...BASE_ARGS, categoryTree: [], currency: "EUR" });

        const sent = JSON.stringify(model.doGenerateCalls[0]?.prompt);
        expect(sent).toContain("charged in EUR");
    });
});

describe(sanitizeDomain, () => {
    it("strips a leading www. so logo.dev's apex-only lookup still matches", () => {
        expect(sanitizeDomain("www.unicasa.com.ve")).toBe("unicasa.com.ve");
    });

    it("does not strip a host that merely starts with the letters www", () => {
        expect(sanitizeDomain("wwwfoo.com")).toBe("wwwfoo.com");
    });

    it("rejects www. alone, since nothing remains after stripping", () => {
        expect(sanitizeDomain("www.")).toBeNull();
    });

    it("case-folds before stripping, so WWW.NETFLIX.COM also loses its prefix", () => {
        expect(sanitizeDomain("WWW.NETFLIX.COM")).toBe("netflix.com");
    });

    it.each([
        ["a url", "https://netflix.com"],
        ["a bare name", "netflix"],
        ["a host over 253 characters", `${"a".repeat(250)}.com`],
    ])("rejects %s before it reaches the logo fetcher", (_, domain) => {
        expect(sanitizeDomain(domain)).toBeNull();
    });
});

describe(sanitizeCurrencyCode, () => {
    it("uppercases a valid lowercase code", () => {
        expect(sanitizeCurrencyCode("eur")).toBe("EUR");
    });

    it("rejects anything that is not a currency the app can pick", () => {
        expect(sanitizeCurrencyCode("EURO")).toBeUndefined();
        expect(sanitizeCurrencyCode("E1R")).toBeUndefined();
        expect(sanitizeCurrencyCode("AAA")).toBeUndefined();
        expect(sanitizeCurrencyCode("")).toBeUndefined();
        expect(sanitizeCurrencyCode(undefined)).toBeUndefined();
    });
});

describe(sanitizeRegionCode, () => {
    it("uppercases a valid lowercase code", () => {
        expect(sanitizeRegionCode("ve")).toBe("VE");
    });

    it("rejects a three-letter code", () => {
        expect(sanitizeRegionCode("VEN")).toBeUndefined();
    });

    it("passes undefined through unchanged", () => {
        expect(sanitizeRegionCode(undefined)).toBeUndefined();
    });
});

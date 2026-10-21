/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import { captureLimiter, FREE_CAPTURE_CONFIG } from "./lib/captures";
import { LANGUAGE_PATTERN } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { AI_CONSENT_VERSION } from "./lib/models";
import {
    buildPrompt,
    looksLikeJpeg,
    MAX_IMAGE_BYTES,
    MAX_ITEMS,
    normalizeDraft,
    normalizeItems,
    rateLimiter,
} from "./receiptScan";
import type { ModelOutput } from "./receiptScan";
import schema from "./schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).buffer;

const BASE_ARGS = {
    accounts: ["Visa", "Cash"],
    aiConsent: AI_CONSENT_VERSION,
    categoryTree: [
        { children: ["Coffee"], name: "Food" },
        { children: [], name: "Groceries" },
    ],
    currency: "USD",
    image: JPEG,
    today: "2026-09-05",
};

const CONTEXT = {
    accounts: BASE_ARGS.accounts,
    categoryTree: BASE_ARGS.categoryTree,
    currency: "USD",
    today: "2026-09-05",
};

const MODEL_ANSWER: ModelOutput = {
    accountName: "visa",
    categoryName: "groceries",
    currency: "eur",
    currencyPrinted: true,
    date: "2026-09-04",
    domain: "https://www.mercadona.es/shop",
    found: true,
    items: [
        { name: "  Leche entera 1L ", price: 1.9, quantity: 2 },
        { name: "Pan chapata", price: 1.25, quantity: null },
        { name: "", price: 4.35, quantity: 1 },
        { name: "Sin precio", price: null, quantity: 1 },
        { name: "Negativo", price: -2, quantity: 1 },
    ],
    kind: "expense",
    merchant: "Mercadona",
    paymentMethod: "Visa •••• 4242",
    subtotal: null,
    tax: 1.32,
    tip: null,
    total: 20.56,
};

describe("normalizeDraft", () => {
    it("resolves names in the ledger's spelling, uppercases the currency, and strips the domain to a hostname", () => {
        expect(normalizeDraft(MODEL_ANSWER, CONTEXT)).toStrictEqual({
            accountName: "Visa",
            categoryName: "Groceries",
            currency: "EUR",
            currencySource: "printed",
            currencyUnresolved: false,
            date: "2026-09-04",
            domain: "mercadona.es",
            income: false,
            items: [
                { name: "Leche entera 1L", price: 1.9, quantity: 2 },
                { name: "Pan chapata", price: 1.25, quantity: 1 },
            ],
            merchant: "Mercadona",
            paymentMethod: "Visa •••• 4242",
            subtotal: null,
            tax: 1.32,
            tip: null,
            total: 20.56,
        });
    });

    it("is null when nothing was found or the total is missing, zero or absurd", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, found: false }, CONTEXT)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, total: null }, CONTEXT)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, total: 0 }, CONTEXT)).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, total: 1e14 }, CONTEXT)).toBeNull();
    });

    it("the ledger's own currency becomes null, and a code the rate table does not know is dropped", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "usd" }, CONTEXT)?.currency).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "euros" }, CONTEXT)?.currency).toBeNull();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "mxn" }, CONTEXT)?.currency).toBe("MXN");
        const unknown = normalizeDraft({ ...MODEL_ANSWER, currency: "RMB" }, CONTEXT);
        expect(unknown?.currency).toBeNull();
        expect(unknown?.currencyUnresolved).toBeTruthy();
        expect(normalizeDraft({ ...MODEL_ANSWER, currency: "usd" }, CONTEXT)?.currencyUnresolved).toBeFalsy();
        expect(normalizeDraft({ ...MODEL_ANSWER, currencyPrinted: false }, CONTEXT)?.currencySource).toBe("inferred");
    });

    it("a date outside the window, in the future — even tomorrow — or not on the calendar becomes today", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2020-01-01" }, CONTEXT)?.date).toBe("2026-09-05");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-09-07" }, CONTEXT)?.date).toBe("2026-09-05");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-09-06" }, CONTEXT)?.date).toBe("2026-09-05");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2026-02-31" }, CONTEXT)?.date).toBe("2026-09-05");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: null }, CONTEXT)?.date).toBe("2026-09-05");
        expect(normalizeDraft({ ...MODEL_ANSWER, date: "2024-09-05" }, CONTEXT)?.date).toBe("2024-09-05");
    });

    it("names the ledger did not offer become null rather than guesses", () => {
        const draft = normalizeDraft({ ...MODEL_ANSWER, accountName: "Amex", categoryName: "Snacks" }, CONTEXT);
        expect(draft?.accountName).toBeNull();
        expect(draft?.categoryName).toBeNull();
    });

    it("a refund slip is income", () => {
        expect(normalizeDraft({ ...MODEL_ANSWER, kind: "refund" }, CONTEXT)?.income).toBeTruthy();
    });

    it("negative or non-finite printed lines become null", () => {
        const draft = normalizeDraft({ ...MODEL_ANSWER, subtotal: -1, tax: Number.NaN, tip: 2 }, CONTEXT);
        expect(draft?.subtotal).toBeNull();
        expect(draft?.tax).toBeNull();
        expect(draft?.tip).toBe(2);
    });
});

describe("normalizeItems", () => {
    it("caps a long receipt at MAX_ITEMS", () => {
        const items = Array.from({ length: MAX_ITEMS + 5 }, (_, index) => ({
            name: `Item ${index}`,
            price: 1,
            quantity: 1,
        }));
        expect(normalizeItems(items)).toHaveLength(MAX_ITEMS);
    });

    it("drops a leading quantity from the name only when it is the quantity the model reported", () => {
        const names = normalizeItems([
            { name: "2 LECHE ENTERA 1L", price: 1.9, quantity: 2 },
            { name: "3x Yogur natural", price: 1.8, quantity: 3 },
            { name: "2 LECHE ENTERA 1L", price: 1.9, quantity: 1 },
            { name: "1000 Islas dressing", price: 2, quantity: 1 },
            { name: "2", price: 2, quantity: 2 },
            { name: "2% Milk", price: 3, quantity: 2 },
            { name: "2x2% Milk", price: 3, quantity: 2 },
        ]).map((item) => item.name);
        expect(names).toStrictEqual([
            "LECHE ENTERA 1L",
            "Yogur natural",
            "2 LECHE ENTERA 1L",
            "1000 Islas dressing",
            "2",
            "2% Milk",
            "2% Milk",
        ]);
    });

    it("a nonsense quantity is one; a fractional one keeps three decimals", () => {
        expect(normalizeItems([{ name: "Kg", price: 3, quantity: 0 }])[0]?.quantity).toBe(1);
        expect(normalizeItems([{ name: "Kg", price: 3, quantity: 1.23456 }])[0]?.quantity).toBe(1.235);
    });
});

describe("looksLikeJpeg and namesWithinBudget", () => {
    it("accepts a JPEG header and refuses anything else", () => {
        expect(looksLikeJpeg(JPEG)).toBeTruthy();
        expect(looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeFalsy();
        expect(looksLikeJpeg(new Uint8Array([0xff]).buffer)).toBeFalsy();
    });
});

describe("LANGUAGE_PATTERN", () => {
    it("accepts a device locale with script, region and extension subtags, and refuses junk", () => {
        expect(LANGUAGE_PATTERN.test("es-ES")).toBeTruthy();
        expect(LANGUAGE_PATTERN.test("sr-Latn-RS-u-ca-gregory")).toBeTruthy();
        expect(LANGUAGE_PATTERN.test("zh-Hant-TW-u-ca-chinese-nu-hanidec")).toBeTruthy();
        expect(LANGUAGE_PATTERN.test("not a tag")).toBeFalsy();
        expect(LANGUAGE_PATTERN.test("en-toolongsubtag")).toBeFalsy();
    });
});

describe("buildPrompt", () => {
    it("names the ledger currency, today, the region and every category and account", () => {
        const prompt = buildPrompt({ ...CONTEXT, language: "es-ES", regionCode: "ES" });
        expect(prompt).toContain("Today is 2026-09-05");
        expect(prompt).toContain("The ledger's currency is USD");
        expect(prompt).toContain("for a receipt in ES");
        expect(prompt).toContain("Food (containing Coffee); Groceries");
        expect(prompt).toContain("Their accounts are: Visa, Cash");
        expect(prompt).toContain("es-ES");
    });
});

describe("scan guard ladder", () => {
    it("returns unauthenticated for a signed-out caller", async () => {
        const t = convexTest(schema, modules);

        await expect(t.action(api.receiptScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            receipt: null,
            status: "unauthenticated",
        });
    });

    it("returns notConfigured when ANTHROPIC_API_KEY is unset, never throws", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(authenticatedAs(t, identity).action(api.receiptScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            receipt: null,
            status: "notConfigured",
        });
    });

    it("never sends a photo from a build that asked about other AI providers", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const { aiConsent: _consent, ...oldBuild } = BASE_ARGS;

        await expect(authenticatedAs(t, identity).action(api.receiptScan.scan, oldBuild)).resolves.toMatchObject({
            status: "notConfigured",
        });
    });

    it("returns invalid for an oversized, empty or non-JPEG image and for a malformed date, currency or region", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const invalid = { receipt: null, status: "invalid" };

        await expect(
            asUser.action(api.receiptScan.scan, { ...BASE_ARGS, image: new ArrayBuffer(MAX_IMAGE_BYTES + 1) })
        ).resolves.toStrictEqual(invalid);
        await expect(
            asUser.action(api.receiptScan.scan, { ...BASE_ARGS, image: new ArrayBuffer(0) })
        ).resolves.toStrictEqual(invalid);
        await expect(
            asUser.action(api.receiptScan.scan, {
                ...BASE_ARGS,
                image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
            })
        ).resolves.toStrictEqual(invalid);
        await expect(asUser.action(api.receiptScan.scan, { ...BASE_ARGS, today: "yesterday" })).resolves.toStrictEqual(
            invalid
        );
        await expect(asUser.action(api.receiptScan.scan, { ...BASE_ARGS, currency: "usd" })).resolves.toStrictEqual(
            invalid
        );
        await expect(asUser.action(api.receiptScan.scan, { ...BASE_ARGS, regionCode: "Spain" })).resolves.toStrictEqual(
            invalid
        );
    });

    it("a global reject spends none of the caller's captures", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const tokenIdentifier = await authenticatedAs(t, identity).run(
            async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier
        );
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }
        vi.spyOn(rateLimiter, "limit").mockImplementation(async (_ctx, name) =>
            name === "receiptScanGlobal" ? { ok: false, retryAfter: 1000 } : { ok: true, retryAfter: undefined }
        );

        await expect(authenticatedAs(t, identity).action(api.receiptScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            receipt: null,
            status: "rateLimited",
        });
        await expect(
            t.run((ctx) =>
                captureLimiter.check(ctx, "capturesFree", { count: FREE_CAPTURE_CONFIG.rate, key: tokenIdentifier })
            )
        ).resolves.toMatchObject({ ok: true });
    });

    it("returns notEntitled once a free user's capture pool is spent, before any model call", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const tokenIdentifier = await authenticatedAs(t, identity).run(
            async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier
        );
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }

        await t.run((ctx) =>
            captureLimiter.limit(ctx, "capturesFree", {
                count: FREE_CAPTURE_CONFIG.rate,
                key: tokenIdentifier,
            })
        );

        await expect(authenticatedAs(t, identity).action(api.receiptScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            receipt: null,
            status: "notEntitled",
        });
    });

    it("returns rateLimited once the per-user bucket is exhausted, before any model call", async () => {
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
            rateLimiter.limit(ctx, "receiptScanPerUser", {
                config: perUserBurst("receiptScan", false),
                count: perUserBurst("receiptScan", false).capacity,
                key: tokenIdentifier,
            })
        );

        await expect(asUser.action(api.receiptScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            receipt: null,
            status: "rateLimited",
        });
    });
});

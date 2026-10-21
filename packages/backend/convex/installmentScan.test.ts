import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import { normalizePlan, MAX_INSTALLMENTS } from "./installmentScan";
import type { ModelOutput } from "./installmentScan";
import { captureLimiter, FREE_CAPTURE_CONFIG } from "./lib/captures";
import { AI_CONSENT_VERSION } from "./lib/models";
import { MAX_IMAGE_BYTES } from "./receiptScan";
import schema from "./schema";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).buffer;

const BASE_ARGS = {
    accounts: ["Cashea", "Visa"],
    aiConsent: AI_CONSENT_VERSION,
    currency: "USD",
    image: JPEG,
    regionCode: "VE",
    today: "2026-10-21",
};

const CONTEXT = { accounts: BASE_ARGS.accounts, currency: "USD", today: "2026-10-21" };

const row = (
    sequence: number,
    month: number,
    day: number,
    amount: number,
    extra: Partial<ModelOutput["rows"][0]> = {}
) => ({
    amount,
    day,
    fee: 0,
    month,
    paid: false,
    sequence,
    year: null,
    ...extra,
});

const MODEL_ANSWER: ModelOutput = {
    accountName: "cashea",
    currency: "usd",
    found: true,
    provider: "  Cashea ",
    rows: [
        row(2, 7, 6, 33.8),
        row(0, 6, 8, 67.6, { paid: true }),
        row(1, 6, 22, 33.8, { fee: 4, paid: true }),
        row(3, 7, 20, 33.8, { fee: 4 }),
    ],
};

const datesOf = (output: ModelOutput, today = CONTEXT.today) =>
    normalizePlan(output, { ...CONTEXT, today })?.rows.map((planned) => planned.dueDate) ?? null;

describe("normalizePlan", () => {
    it("orders the rows, dates them in this year and resolves names in the ledger's spelling", () => {
        expect(normalizePlan(MODEL_ANSWER, CONTEXT)).toStrictEqual({
            accountName: "Cashea",
            currency: "USD",
            provider: "Cashea",
            rows: [
                { amount: 67.6, dueDate: "2026-06-08", fee: 0, paid: true, sequence: 0 },
                { amount: 33.8, dueDate: "2026-06-22", fee: 4, paid: true, sequence: 1 },
                { amount: 33.8, dueDate: "2026-07-06", fee: 0, paid: false, sequence: 2 },
                { amount: 33.8, dueDate: "2026-07-20", fee: 4, paid: false, sequence: 3 },
            ],
        });
    });

    it("carries a plan across New Year into the next year", () => {
        const output = { ...MODEL_ANSWER, rows: [row(0, 12, 20, 40), row(1, 1, 3, 20), row(2, 1, 17, 20)] };
        expect(datesOf(output, "2027-01-05")).toStrictEqual(["2026-12-20", "2027-01-03", "2027-01-17"]);
    });

    it("puts a first cuota due soon after New Year in the coming year, and an older one in the past", () => {
        const output = { ...MODEL_ANSWER, rows: [row(1, 2, 1, 20), row(2, 3, 1, 20)] };
        expect(datesOf(output, "2026-12-20")).toStrictEqual(["2027-02-01", "2027-03-01"]);
        expect(datesOf(output, "2026-10-21")).toStrictEqual(["2026-02-01", "2026-03-01"]);
    });

    it("keeps a printed year and refuses a day the calendar lacks or a date out of order", () => {
        const printed = {
            ...MODEL_ANSWER,
            rows: [row(1, 12, 1, 20, { year: 2025 }), row(2, 1, 1, 20, { year: 2026 })],
        };
        expect(datesOf(printed)).toStrictEqual(["2025-12-01", "2026-01-01"]);
        expect(datesOf({ ...MODEL_ANSWER, rows: [row(1, 2, 30, 20)] })).toBeNull();
        expect(
            datesOf({ ...printed, rows: [row(1, 1, 1, 20, { year: 2026 }), row(2, 12, 1, 20, { year: 2025 })] })
        ).toBeNull();
    });

    it("is null when nothing was found, a cuota is missing or unpriced, or only the upfront is shown", () => {
        expect(normalizePlan({ ...MODEL_ANSWER, found: false }, CONTEXT)).toBeNull();
        expect(normalizePlan({ ...MODEL_ANSWER, rows: [row(0, 6, 8, 60), row(2, 7, 6, 30)] }, CONTEXT)).toBeNull();
        expect(normalizePlan({ ...MODEL_ANSWER, rows: [row(1, 6, 8, 0)] }, CONTEXT)).toBeNull();
        expect(normalizePlan({ ...MODEL_ANSWER, rows: [row(0, 6, 8, 60)] }, CONTEXT)).toBeNull();
        const tooLong = Array.from({ length: MAX_INSTALLMENTS + 1 }, (_, index) =>
            row(index + 1, 1, 1, 10, { year: 2026 + index })
        );
        expect(normalizePlan({ ...MODEL_ANSWER, rows: tooLong }, CONTEXT)).toBeNull();
    });

    it("a nonsense fee is no fee, and unknown names or currencies become null", () => {
        const draft = normalizePlan(
            { ...MODEL_ANSWER, accountName: "Krece", currency: "dollars", rows: [row(1, 6, 8, 30, { fee: -4 })] },
            CONTEXT
        );
        expect(draft?.rows[0]?.fee).toBe(0);
        expect(draft?.accountName).toBeNull();
        expect(draft?.currency).toBeNull();
    });
});

describe("scan guard ladder", () => {
    it("returns unauthenticated for a signed-out caller", async () => {
        const t = convexTest(schema, modules);

        await expect(t.action(api.installmentScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            plan: null,
            status: "unauthenticated",
        });
    });

    it("never sends a screenshot without a key or from a build that asked about other AI providers", async () => {
        const t = convexTest(schema, modules);
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const { aiConsent: _consent, ...oldBuild } = BASE_ARGS;

        vi.stubEnv("ANTHROPIC_API_KEY", "");
        await expect(asUser.action(api.installmentScan.scan, BASE_ARGS)).resolves.toMatchObject({
            status: "notConfigured",
        });
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        await expect(asUser.action(api.installmentScan.scan, oldBuild)).resolves.toMatchObject({
            status: "notConfigured",
        });
    });

    it("returns invalid for an oversized or non-JPEG image and for a malformed date, currency or region", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const invalid = { plan: null, status: "invalid" };

        const cases = [
            { image: new ArrayBuffer(MAX_IMAGE_BYTES + 1) },
            { image: new ArrayBuffer(0) },
            { image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer },
            { today: "yesterday" },
            { currency: "usd" },
            { regionCode: "Venezuela" },
            { accounts: ["x".repeat(81)] },
        ];
        await expect(
            Promise.all(cases.map((args) => asUser.action(api.installmentScan.scan, { ...BASE_ARGS, ...args })))
        ).resolves.toStrictEqual(cases.map(() => invalid));
    });

    it("spends from the receipt scans' capture pool, before any model call", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const tokenIdentifier = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        if (!tokenIdentifier) {
            throw new Error("Expected an authenticated identity");
        }

        await t.run((ctx) =>
            captureLimiter.limit(ctx, "capturesFree", { count: FREE_CAPTURE_CONFIG.rate, key: tokenIdentifier })
        );

        await expect(asUser.action(api.installmentScan.scan, BASE_ARGS)).resolves.toStrictEqual({
            plan: null,
            status: "notEntitled",
        });
    });
});

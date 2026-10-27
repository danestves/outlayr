/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

describe("groundedSpend", () => {
    it("monthlyTotal sums only rows within the same calendar month", async () => {
        const t = convexTest(schema, modules);
        const lastMonth = Date.UTC(2026, 5, 20);
        const thisMonth = Date.UTC(2026, 6, 3);
        const laterThisMonth = Date.UTC(2026, 6, 20);

        await t.mutation(internal.groundedSpend.record, {
            actualMicros: 999_999,
            at: lastMonth,
            chargedMicros: 20_000,
            inputTokens: 1,
            outputTokens: 1,
            published: false,
            searchCalls: 1,
        });
        await t.mutation(internal.groundedSpend.record, {
            actualMicros: 4000,
            at: thisMonth,
            chargedMicros: 20_000,
            inputTokens: 500,
            outputTokens: 50,
            published: true,
            searchCalls: 1,
        });

        const result = await t.query(internal.groundedSpend.monthlyTotal, {
            at: laterThisMonth,
        });

        expect(result.totalMicros).toBe(4000);
    });
});

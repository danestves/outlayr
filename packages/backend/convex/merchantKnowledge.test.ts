/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { internal } from "./_generated/api";
import { MODEL_TTL_MS } from "./lib/merchantTrust";
import * as merchantKnowledge from "./merchantKnowledge";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("merchantKnowledge visibility (T5)", () => {
    it("exports no public query or mutation", () => {
        const exported = Object.entries(merchantKnowledge);
        expect(exported.length).toBeGreaterThan(0);
        for (const [name, fn] of exported) {
            const flags = fn as { isPublic?: boolean; isInternal?: boolean };
            // The generated `api` is an `anyApi` proxy, so only these registration flags can catch a public function.
            expect(flags.isPublic, `${name} must not be public`).not.toBeTruthy();
            expect(flags.isInternal, `${name} must be internal`).toBeTruthy();
        }
    });
});

describe("time-bounded knowledge", () => {
    const ANSWER = {
        categoryName: "Travel",
        domain: "care4bag.gr",
        emoji: null,
        merchantName: "Care4Bag",
        modelId: "test-model",
        parentCategoryName: null,
        tags: ["luggage"],
    };

    it("answers from the first key with a live row, and not from an expired one", async () => {
        const t = convexTest(schema, modules);
        const now = Date.UTC(2026, 8, 19);
        await t.mutation(internal.merchantKnowledge.record, {
            ...ANSWER,
            keys: ["care4bag ae|eur", "care4bag|eur"],
            resolvedAt: now,
            source: "model",
        });

        await expect(
            t.query(internal.merchantKnowledge.lookup, { keys: ["nothing|eur", "care4bag|eur"], now })
        ).resolves.toMatchObject({ key: "care4bag|eur", merchantName: "Care4Bag", source: "model" });
        await expect(
            t.query(internal.merchantKnowledge.lookup, { keys: ["care4bag|eur"], now: now + MODEL_TTL_MS + 1 })
        ).resolves.toBeNull();
    });

    it("keeps a fresh web-verified answer over a later model one, and lets the web replace the model", async () => {
        const t = convexTest(schema, modules);
        const now = Date.UTC(2026, 8, 19);
        await t.mutation(internal.merchantKnowledge.record, {
            ...ANSWER,
            keys: ["care4bag|eur"],
            resolvedAt: now,
            source: "web",
        });
        await t.mutation(internal.merchantKnowledge.record, {
            ...ANSWER,
            domain: "care4bag.com",
            keys: ["care4bag|eur"],
            resolvedAt: now + 1,
            source: "model",
        });

        await expect(
            t.query(internal.merchantKnowledge.lookup, { keys: ["care4bag|eur"], now: now + 2 })
        ).resolves.toMatchObject({ domain: "care4bag.gr", source: "web" });

        await t.mutation(internal.merchantKnowledge.record, {
            ...ANSWER,
            domain: "care4bag.eu",
            keys: ["care4bag|eur"],
            resolvedAt: now + 3,
            source: "web",
        });

        await expect(
            t.query(internal.merchantKnowledge.lookup, { keys: ["care4bag|eur"], now: now + 4 })
        ).resolves.toMatchObject({ domain: "care4bag.eu" });
    });
});

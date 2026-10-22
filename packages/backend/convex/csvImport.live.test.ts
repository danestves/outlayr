/// <reference types="vite/client" />

/** Opt-in (RUN_LIVE_MODEL_TESTS=1, ANTHROPIC_API_KEY): spends tokens. Asserts the contract, not a specific mapping. */

import { createAnthropic } from "@ai-sdk/anthropic";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import { classify } from "./csvImport";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import schema from "./schema";
import { authenticatedAs, seedProUser } from "./test.helpers";

const modules = import.meta.glob("./**/*.ts");

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const enabled = process.env.RUN_LIVE_MODEL_TESTS === "1" && apiKey !== "";

const MODEL_ID = process.env.CLAUDE_FAST_MODEL_ID ?? CLAUDE_FAST_MODEL_ID;

/** Merchants absent from the on-device map, so the model is the only tier left. */
const LABELS = ["Panaderia La Espiga SC", "Ferreteria Don Pepe", "Cafe Tostado Rincon"];

const CATEGORY_TREE = [
    { children: ["Groceries", "Restaurants"], name: "Food" },
    { children: ["Maintenance"], name: "Home" },
];

const OFFERED = new Set(CATEGORY_TREE.flatMap((branch) => [branch.name, ...branch.children]));

describe.skipIf(!enabled)("csvImport against the live model", () => {
    it("classify maps unfamiliar merchants into categories the caller offered", async () => {
        const result = await classify(createAnthropic({ apiKey })(MODEL_ID), {
            categoryTree: CATEGORY_TREE,
            labels: LABELS,
        });

        expect(result.status).toBe("ok");
        expect(result.suggestions?.length).toBeGreaterThan(0);

        for (const suggestion of result.suggestions ?? []) {
            expect(LABELS).toContain(suggestion.label);
            expect(OFFERED.has(suggestion.categoryName)).toBeTruthy();
            // The model tier never sources a domain; only merchantKnowledge does.
            expect(suggestion.domain).toBeNull();
        }
    }, 30_000);

    it("the action returns ok end to end for an authenticated caller", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", apiKey);
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedProUser(t);

        const result = await authenticatedAs(t, identity).action(api.csvImport.csvImport, {
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: CATEGORY_TREE,
            groundedLookup: false,
            labels: LABELS,
        });

        expect(result.status).toBe("ok");
        expect(result.suggestions?.length).toBeGreaterThan(0);
        for (const suggestion of result.suggestions ?? []) {
            expect(OFFERED.has(suggestion.categoryName)).toBeTruthy();
        }
    }, 30_000);
});

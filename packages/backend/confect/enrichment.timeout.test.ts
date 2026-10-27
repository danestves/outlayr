/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { MockLanguageModelV4 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { EMPTY } from "./enrichment";
import { AI_CONSENT_VERSION } from "./lib/models";
import { authenticatedAs, seedProUser } from "./test.helpers";

vi.mock(import("@ai-sdk/anthropic"), async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        createAnthropic: (options) =>
            Object.assign(
                () =>
                    new MockLanguageModelV4({
                        doGenerate: () =>
                            Promise.reject(
                                Object.assign(new Error("The operation was aborted due to timeout"), {
                                    name: "TimeoutError",
                                })
                            ),
                    }),
                original.createAnthropic(options)
            ),
    };
});

const modules = import.meta.glob("../convex/**/*.ts");

const BASE_ARGS = {
    aiConsent: AI_CONSENT_VERSION,
    categoryTree: [{ children: [], name: "Travel" }],
    groundedLookup: true,
    income: false,
    name: "FONTANA DI TREVI",
};

async function scheduledGroundedRuns(t: ReturnType<typeof convexTest>) {
    const rows = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    return rows.filter((row) => row.name.includes("groundedLookup"));
}

beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
});

describe("an inline call that timed out", () => {
    it("still schedules the grounded lookup it never reached", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedProUser(t);

        const result = await authenticatedAs(t, identity).action(api.enrichment.suggest, BASE_ARGS);

        expect(result).toStrictEqual({ ...EMPTY, grounding: true });
        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(1);
    });

    it("reports no grounding when the client withheld consent", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedProUser(t);

        const result = await authenticatedAs(t, identity).action(api.enrichment.suggest, {
            ...BASE_ARGS,
            groundedLookup: false,
        });

        expect(result).toStrictEqual(EMPTY);
        await expect(scheduledGroundedRuns(t)).resolves.toHaveLength(0);
    });
});

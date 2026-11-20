/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { resolveTextModel } from "@outlayr/ai/model";
import { fails, fakeModel } from "@outlayr/ai/testing";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { EMPTY } from "./enrichment";
import { authenticatedAs, seedProUser } from "./test.helpers";

vi.mock(import("@outlayr/ai/model"), async (importOriginal) => ({
    ...(await importOriginal()),
    resolveTextModel: vi.fn<typeof resolveTextModel>(),
}));

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
    vi.mocked(resolveTextModel).mockImplementation((route) =>
        Effect.succeed(Option.some(fakeModel([fails("The operation was aborted due to timeout")], { route }).model))
    );
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

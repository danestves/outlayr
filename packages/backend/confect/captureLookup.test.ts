/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workpoolTest from "@convex-dev/workpool/test";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { MockLanguageModelV3 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { captureEnrich } from "./captureLookup";
import { rateLimiter } from "./enrichment";
import { purgeUserBatch } from "./lib/account";
import { runEdge } from "./lib/runEdge";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const KEY = "k".repeat(43);
const CAPTURE = {
    aiConsent: AI_CONSENT_VERSION,
    captureId: "3f1c9a2e-capture",
    categoryTree: [{ children: [], name: "Travel" }],
    currency: "EUR",
    groundedLookup: false,
    income: false,
    name: "CARE4BAG AE",
};

type TestClient = ReturnType<typeof setup>;

function setup() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    workpoolTest.register(t, "enrichmentPool");
    return t;
}

async function deviceWithKey(t: TestClient) {
    const user = await seedAuthUser(t);
    await authenticatedAs(t, user).mutation(api.captureLookup.register, { deviceId: "phone", key: KEY });
    return user;
}

function model(payload: unknown) {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ text: JSON.stringify(payload), type: "text" }],
            finishReason: { raw: undefined, unified: "stop" },
            usage: {
                inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: undefined, total: undefined },
                outputTokens: { reasoning: undefined, text: undefined, total: undefined },
            },
            warnings: [],
        }),
    });
}

const unreachable = new MockLanguageModelV3({
    doGenerate: () => {
        throw new Error("model unreachable");
    },
});

async function capture(t: TestClient, body: unknown, fast: MockLanguageModelV3 = unreachable, key = KEY) {
    return await t.action(async (ctx) => {
        const response = await Effect.runPromise(
            captureEnrich(
                ctx,
                new Request("https://example.convex.site/capture/enrich", {
                    body: JSON.stringify(body),
                    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                    method: "POST",
                }),
                fast
            )
        );
        const reply: unknown = await response.json();
        return { body: reply, status: response.status };
    });
}

const jobs = (t: TestClient) => t.run((ctx) => ctx.db.query("enrichmentJobs").collect());

describe("capture lookup", () => {
    it("answers on the spot and leaves the answer under the capture id for the capturing phone only", async () => {
        const t = setup();
        const user = await deviceWithKey(t);
        const fast = model({
            brand: "Care4Bag",
            categoryName: "Travel",
            domain: "care4bag.gr",
            domainConfidence: "high",
            isNewCategory: false,
            tags: [],
        });

        const { body, status } = await capture(t, CAPTURE, fast);

        expect(status).toBe(200);
        expect(body).toMatchObject({ answer: { categoryName: "Travel", merchantName: "Care4Bag" }, queued: false });
        const results = await authenticatedAs(t, user).query(api.enrichmentQueue.results, { deviceId: "phone" });
        const elsewhere = await authenticatedAs(t, user).query(api.enrichmentQueue.results, { deviceId: "tablet" });
        expect(elsewhere).toStrictEqual([]);
        expect(results).toStrictEqual([
            expect.objectContaining({
                localId: CAPTURE.captureId,
                result: expect.objectContaining({ merchantName: "Care4Bag" }),
            }),
        ]);
    });

    it("queues the full lookup under the capture id when the fast model misses its budget", async () => {
        const t = setup();
        await deviceWithKey(t);

        const { body, status } = await capture(t, CAPTURE);

        expect(status).toBe(200);
        expect(body).toStrictEqual({ answer: null, queued: true });
        const [job] = await jobs(t);
        expect(job).toMatchObject({ localId: CAPTURE.captureId, status: "queued" });
    });

    it("refuses a key it never issued", async () => {
        const t = setup();
        await deviceWithKey(t);

        const response = await t.fetch("/capture/enrich", {
            body: JSON.stringify(CAPTURE),
            headers: { Authorization: `Bearer ${"x".repeat(43)}` },
            method: "POST",
        });

        expect(response.status).toBe(401);
        await expect(jobs(t)).resolves.toHaveLength(0);
    });

    it("refuses a capture sent without the current AI consent", async () => {
        const t = setup();
        await deviceWithKey(t);
        const { aiConsent: _consent, ...withoutConsent } = CAPTURE;

        const { status } = await capture(t, withoutConsent);

        expect(status).toBe(403);
        await expect(jobs(t)).resolves.toHaveLength(0);
    });

    it("spends the same per-user allowance as the in-app queue", async () => {
        const t = setup();
        const user = await deviceWithKey(t);
        await t.run((ctx) => rateLimiter.limit(ctx, "enrichmentQueue", { count: 60, key: user.userId }));

        const { status } = await capture(t, CAPTURE);

        expect(status).toBe(403);
        await expect(jobs(t)).resolves.toHaveLength(0);
    });

    it("stops honouring a key once the device revokes it", async () => {
        const t = setup();
        const user = await deviceWithKey(t);

        await authenticatedAs(t, user).mutation(api.captureLookup.revoke, { deviceId: "phone" });

        await expect(capture(t, CAPTURE)).resolves.toMatchObject({ status: 401 });
    });

    it("stops honouring a key once its account is deleted", async () => {
        const t = setup();
        const user = await deviceWithKey(t);

        let done = false;
        while (!done) {
            ({ done } = await t.run((ctx) => runEdge(purgeUserBatch(ctx, user.userId))));
        }

        await expect(capture(t, CAPTURE)).resolves.toMatchObject({ status: 401 });
    });

    it("issues keys only to a signed-in caller", async () => {
        const t = setup();

        await expect(t.mutation(api.captureLookup.register, { deviceId: "phone", key: KEY })).rejects.toThrow(
            "Unauthenticated"
        );
    });
});

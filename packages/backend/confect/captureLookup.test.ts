/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import workpoolTest from "@convex-dev/workpool/test";
import type { TextModel } from "@outlayr/ai/model";
import { answers, fails, fakeModel } from "@outlayr/ai/testing";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { captureEnrich } from "./captureLookup";
import { rateLimiter } from "./enrichment";
import { CAPTURE_PUSH_EFFECTIVE_AT_MS } from "./legal";
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

const model = (payload: unknown) => fakeModel([answers(payload)]).model;

async function capture(
    t: TestClient,
    body: unknown,
    fast: TextModel = fakeModel([fails("model unreachable")]).model,
    key = KEY
) {
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

const PHONE_TOKEN = "a".repeat(64);
const DAY_MS = 24 * 60 * 60 * 1000;
const ANSWER = {
    categoryName: "Groceries",
    domain: "care4bag.gr",
    emoji: null,
    isNewCategory: false,
    merchantName: "Care4Bag",
    parentCategoryName: null,
    tags: [],
};

async function pushReady(t: TestClient, deviceId = "phone", token = PHONE_TOKEN) {
    const user = await seedAuthUser(t);
    const device = authenticatedAs(t, user);
    await device.mutation(api.captureLookup.register, { deviceId, key: `${deviceId}-${KEY}` });
    const stored = await device.mutation(api.captureLookup.setPush, {
        deviceId,
        environment: "development",
        secret: "5".repeat(64),
        token,
    });
    return { stored, user };
}

async function finishJob(t: TestClient, userId: string, deviceId: string | undefined) {
    const jobId = await t.run((ctx) =>
        ctx.db.insert("enrichmentJobs", {
            categoryTree: CAPTURE.categoryTree,
            deviceId,
            grounded: true,
            income: false,
            localId: CAPTURE.captureId,
            name: CAPTURE.name,
            status: "queued",
            userId,
        })
    );
    await t.mutation(internal.enrichmentQueue.finish, { jobId, result: ANSWER });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
}

describe("capture push", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    async function live(now = CAPTURE_PUSH_EFFECTIVE_AT_MS) {
        vi.useFakeTimers({ now });
        const { privateKey } = await generateKeyPair("ES256", { extractable: true });
        vi.stubEnv("APNS_KEY_ID", "KEY1234567");
        vi.stubEnv("APNS_PRIVATE_KEY", await exportPKCS8(privateKey));
        vi.stubEnv("APNS_TEAM_ID", "8ZB3YXDU7V");
        const sent = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
        vi.stubGlobal("fetch", sent);
        return sent;
    }

    it("tells only the phone that captured the purchase, sealed so Apple can't read it", async () => {
        const sent = await live();
        const t = setup();
        const { user } = await pushReady(t);
        const tablet = authenticatedAs(t, user);
        await tablet.mutation(api.captureLookup.register, { deviceId: "tablet", key: `tablet-${KEY}` });
        await tablet.mutation(api.captureLookup.setPush, {
            deviceId: "tablet",
            environment: "development",
            secret: "6".repeat(64),
            token: "b".repeat(64),
        });

        await finishJob(t, user.userId, "phone");

        expect(sent).toHaveBeenCalledOnce();
        const [url, init] = sent.mock.calls[0] ?? [];
        expect(url).toBe(`https://api.sandbox.push.apple.com/3/device/${PHONE_TOKEN}`);
        expect(init?.headers).toMatchObject({ "apns-collapse-id": CAPTURE.captureId });
        expect(String(init?.body)).not.toMatch(/Care4Bag|Groceries|CARE4BAG/u);
    });

    it("never pushes an in-app lookup, which no single phone is waiting on", async () => {
        const sent = await live();
        const t = setup();
        const { user } = await pushReady(t);

        await finishJob(t, user.userId, undefined);

        expect(sent).not.toHaveBeenCalled();
    });

    it("sends nothing to a phone that signed out or an account that was deleted", async () => {
        const sent = await live();
        const t = setup();
        const signedOut = await pushReady(t);
        const deleted = await pushReady(t, "other", "c".repeat(64));
        await authenticatedAs(t, signedOut.user).mutation(api.captureLookup.revoke, { deviceId: "phone" });
        let done = false;
        while (!done) {
            ({ done } = await t.run((ctx) => runEdge(purgeUserBatch(ctx, deleted.user.userId))));
        }

        await finishJob(t, signedOut.user.userId, "phone");
        await t.action(internal.captureLookup.push, {
            captureId: CAPTURE.captureId,
            deviceId: "other",
            name: CAPTURE.name,
            result: ANSWER,
            userId: deleted.user.userId,
        });

        expect(sent).not.toHaveBeenCalled();
    });

    it("stores no push token before the privacy notice announcing it takes effect", async () => {
        await live(CAPTURE_PUSH_EFFECTIVE_AT_MS - DAY_MS);
        const t = setup();

        const { stored } = await pushReady(t);

        expect(stored).toBeFalsy();
        const keys = await t.run((ctx) => ctx.db.query("captureKeys").collect());
        expect(keys.map((row) => row.push)).toStrictEqual([undefined]);
    });
});

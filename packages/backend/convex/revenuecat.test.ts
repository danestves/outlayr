/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import { isPro } from "./revenuecat";
import schema from "./schema";
import { authenticatedAs, grantPro, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("./**/*.ts");

const WEBHOOK_PATH = "/webhooks/revenuecat";

function initialPurchase(appUserId: string) {
    const now = Date.now();
    return {
        api_version: "1.0",
        event: {
            app_user_id: appUserId,
            entitlement_ids: ["pro"],
            environment: "SANDBOX",
            event_timestamp_ms: now,
            expiration_at_ms: now + 86_400_000,
            id: `evt-${appUserId}`,
            original_transaction_id: `otx-${appUserId}`,
            period_type: "NORMAL",
            product_id: "com.tryoutlayr.app.pro.monthly",
            purchased_at_ms: now,
            store: "APP_STORE",
            transaction_id: `tx-${appUserId}`,
            type: "INITIAL_PURCHASE",
        },
    };
}

describe("webhook route", () => {
    it("rejects a delivery without the shared secret and mirrors nothing", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);

        const response = await t.fetch(WEBHOOK_PATH, {
            body: JSON.stringify(initialPurchase(identity.userId)),
            headers: { Authorization: "Bearer not-the-secret" },
            method: "POST",
        });

        expect(response.status).toBe(401);
        await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeFalsy();
    });

    it("an authorised INITIAL_PURCHASE makes the user Pro", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const other = await seedAuthUser(t);

        const response = await t.fetch(WEBHOOK_PATH, {
            body: JSON.stringify(initialPurchase(identity.userId)),
            headers: { Authorization: `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH}` },
            method: "POST",
        });

        expect(response.status).toBe(200);
        await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeTruthy();
        await expect(t.run((ctx) => isPro(ctx, other.userId))).resolves.toBeFalsy();
    });
});

describe("syncFromStore", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("mirrors the store's answer so a fresh purchase does not wait for the webhook", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const now = Date.now();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Response.json({
                    subscriber: {
                        entitlements: {
                            pro: {
                                expires_date: new Date(now + 86_400_000).toISOString(),
                                product_identifier: "com.tryoutlayr.app.pro.monthly",
                                purchase_date: new Date(now).toISOString(),
                            },
                        },
                    },
                })
            )
        );

        await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeTruthy();
        await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeTruthy();
    });

    it("mirrors a subscriber carrying RevenueCat's reserved $ attributes", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const now = Date.now();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Response.json({
                    subscriber: {
                        entitlements: {
                            pro: {
                                expires_date: new Date(now + 86_400_000).toISOString(),
                                product_identifier: "com.tryoutlayr.app.pro.monthly",
                                purchase_date: new Date(now).toISOString(),
                            },
                        },
                        subscriber_attributes: { $attConsentStatus: { updated_at_ms: now, value: "authorized" } },
                    },
                })
            )
        );

        await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeTruthy();
    });

    it("mirrors nothing when the store call fails, and stays false", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(null, { status: 500 }))
        );

        await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeFalsy();
        await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeFalsy();
    });

    it("a token whose session is gone mirrors nothing, even with a valid subject", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const identity = await seedAuthUser(t);
        const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const revoked = t.withIdentity({ sessionId: "session-no-longer-exists", subject: identity.subject });
        await expect(revoked.action(api.revenuecat.syncFromStore, {})).resolves.toBeFalsy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("an unauthenticated caller mirrors nothing", async () => {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(t.action(api.revenuecat.syncFromStore, {})).resolves.toBeFalsy();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

test("falls back to the mirrored entitlement when the store cannot be reached", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    await grantPro(t, identity);
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status: 500 }))
    );

    await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeTruthy();

    vi.unstubAllGlobals();
});

test("falls back to the mirror when the store request throws", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    await grantPro(t, identity);
    vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("getaddrinfo ENOTFOUND")))
    );

    await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeTruthy();

    vi.unstubAllGlobals();
});

test("lets the store remove an entitlement the mirror still holds", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    await grantPro(t, identity);
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ subscriber: { entitlements: {} } }))
    );

    await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeFalsy();
    await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeFalsy();
    vi.unstubAllGlobals();
});

test("expires an entitlement the store now reports as lapsed", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    await grantPro(t, identity);
    vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
            Response.json({
                subscriber: {
                    entitlements: {
                        pro: {
                            expires_date: new Date(Date.now() - 86_400_000).toISOString(),
                            product_identifier: "com.tryoutlayr.app.pro.monthly",
                            purchase_date: new Date(Date.now() - 2 * 86_400_000).toISOString(),
                        },
                    },
                },
            })
        )
    );

    await expect(authenticatedAs(t, identity).action(api.revenuecat.syncFromStore, {})).resolves.toBeFalsy();
    await expect(t.run((ctx) => isPro(ctx, identity.userId))).resolves.toBeFalsy();
    vi.unstubAllGlobals();
});

test("stops asking the store when one account hammers the sync", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    // Counts upstream calls, not answers: nothing is ever mirrored here, so without the limiter it would be 14.
    const fetchMock = vi.fn(async () => Response.json({ subscriber: { entitlements: {} } }));
    vi.stubGlobal("fetch", fetchMock);
    const caller = authenticatedAs(t, identity);

    for (let attempt = 0; attempt < 14; attempt += 1) {
        // oxlint-disable-next-line no-await-in-loop -- the limiter is the thing under test, so the calls have to be sequential
        await caller.action(api.revenuecat.syncFromStore, {});
    }

    expect(fetchMock).toHaveBeenCalledTimes(12);
    vi.unstubAllGlobals();
});

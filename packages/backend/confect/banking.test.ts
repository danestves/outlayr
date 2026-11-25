/// <reference types="vite/client" />

import { PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import { RevenueCat } from "convex-revenuecat";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { toInboundWrite } from "./banking";
import type { LinkedAccount } from "./banking";
import { BANKING_EFFECTIVE_AT_MS } from "./legal";
import { seedAuthUser } from "./test.helpers";
import { MAX_INBOX } from "./webhooks.spec";

const modules = import.meta.glob("../convex/**/*.ts");

const LINK: LinkedAccount = { institution: "Bank", last4: "4242", provider: "stripe" };

const transaction = (overrides: Partial<Parameters<typeof toInboundWrite>[1]> = {}) => ({
    accountId: "acct_1",
    amountMinor: -1234,
    currency: "USD",
    description: "Coffee",
    id: "tx_1",
    status: "posted" as const,
    transactedAt: 1_700_000_000_000,
    ...overrides,
});

function setup() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    return t;
}

const insertAccount = (t: ReturnType<typeof setup>, userId: string) =>
    t.run((ctx) =>
        ctx.db.insert("bankAccounts", {
            accountId: "acct_1",
            institution: "Bank",
            kind: "cash",
            last4: "4242",
            linkedAt: 1,
            name: "Checking",
            provider: "stripe",
            status: "active",
            userId,
        })
    );

const claimLease = async (t: ReturnType<typeof setup>, id: Awaited<ReturnType<typeof insertAccount>>) => {
    const lease = await t.mutation(internal.banking.claimPull, { id });
    if (lease === null) {
        throw new Error("expected claimPull to hand out a lease");
    }
    return lease;
};

const syncEntitlement = async (t: ReturnType<typeof setup>, userId: string, expiresDate: string | null) => {
    await t.run((ctx) =>
        new RevenueCat(components.revenuecat).syncSubscriber(ctx, {
            appUserId: userId,
            subscriber: {
                entitlements: {
                    [PRO_ENTITLEMENT_ID]: {
                        expires_date: expiresDate,
                        product_identifier: "com.tryoutlayr.app.pro.monthly",
                        purchase_date: new Date().toISOString(),
                    },
                },
            },
        })
    );
};

const configureStripe = () => {
    vi.stubEnv("STRIPE_BANKING_WEBHOOK_SECRET", "whsec_banking_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_banking");
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("bank transaction to inbound write", () => {
    it("turns cents into the currency's major unit and counts a debit as an expense", () => {
        expect(toInboundWrite(LINK, transaction())).toMatchObject({
            amount: 12.34,
            currency: "USD",
            income: false,
        });
    });

    it("uses the currency's own decimals", () => {
        expect(toInboundWrite(LINK, transaction({ amountMinor: -500, currency: "JPY" }))).toMatchObject({
            amount: 500,
            currency: "JPY",
        });
        expect(toInboundWrite(LINK, transaction({ amountMinor: -1234, currency: "KWD" }))).toMatchObject({
            amount: 1.234,
            currency: "KWD",
        });
    });

    it("files a positive amount as income", () => {
        expect(toInboundWrite(LINK, transaction({ amountMinor: 2500 }))).toMatchObject({
            amount: 25,
            income: true,
        });
    });

    it("drops a transaction with nothing to file", () => {
        expect(toInboundWrite(LINK, transaction({ amountMinor: 0, status: "posted" }))).toBeNull();
    });

    it("keeps a zero-amount void so the phone can remove the entry", () => {
        expect(toInboundWrite(LINK, transaction({ amountMinor: 0, status: "void" }))).toMatchObject({
            amount: 0,
            status: "void",
        });
    });

    it("names the card with the last four digits when the bank gave them", () => {
        expect(toInboundWrite(LINK, transaction())?.card).toBe("Bank ••4242");
        expect(toInboundWrite({ ...LINK, last4: null }, transaction())?.card).toBe("Bank");
    });

    it("keys every write by provider and transaction so the phone can dedupe replays", () => {
        expect(toInboundWrite(LINK, transaction())?.dedupeKey).toBe("bank:stripe:tx_1");
    });
});

describe("bank access", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: BANKING_EFFECTIVE_AT_MS + 86_400_000 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows a renewing Pro entitlement", async () => {
        configureStripe();
        const t = setup();
        const identity = await seedAuthUser(t);
        await syncEntitlement(t, identity.userId, new Date(Date.now() + 86_400_000).toISOString());

        await expect(t.query(internal.banking.accessFor, { userId: identity.userId })).resolves.toBe("allowed");
    });

    it("allows a lifetime Pro, whose entitlement never expires", async () => {
        configureStripe();
        const t = setup();
        const identity = await seedAuthUser(t);
        await syncEntitlement(t, identity.userId, null);

        await expect(t.query(internal.banking.accessFor, { userId: identity.userId })).resolves.toBe("allowed");
    });

    it("leaves a user without Pro on plan", async () => {
        configureStripe();
        const t = setup();
        const identity = await seedAuthUser(t);

        await expect(t.query(internal.banking.accessFor, { userId: identity.userId })).resolves.toBe("plan");
    });

    it("reports unavailable when no provider is configured", async () => {
        vi.stubEnv("STRIPE_BANKING_WEBHOOK_SECRET", "");
        vi.stubEnv("STRIPE_SECRET_KEY", "");
        const t = setup();
        const identity = await seedAuthUser(t);

        await expect(t.query(internal.banking.accessFor, { userId: identity.userId })).resolves.toBe("unavailable");
    });

    it("reports unavailable before the notices announcing bank linking take effect", async () => {
        vi.setSystemTime(BANKING_EFFECTIVE_AT_MS - 86_400_000);
        configureStripe();
        const t = setup();
        const identity = await seedAuthUser(t);
        await syncEntitlement(t, identity.userId, new Date(Date.now() + 86_400_000).toISOString());

        await expect(t.query(internal.banking.accessFor, { userId: identity.userId })).resolves.toBe("unavailable");
    });
});

describe("bank account cursor", () => {
    it("advances only from the cursor the caller read", async () => {
        const t = setup();
        const id = await insertAccount(t, "user-1");
        const lease = await claimLease(t, id);

        await expect(
            t.mutation(internal.banking.advanceCursor, { from: null, id, lease, to: "c1" })
        ).resolves.toBeTruthy();
        const advanced = await t.run((ctx) => ctx.db.get(id));
        expect(advanced).toMatchObject({ cursor: "c1" });
        expect(advanced?.pulledAt).toBeTypeOf("number");

        await expect(
            t.mutation(internal.banking.advanceCursor, { from: null, id, lease, to: "c2" })
        ).resolves.toBeFalsy();
        await expect(t.run((ctx) => ctx.db.get(id))).resolves.toMatchObject({ cursor: "c1" });
    });
});

describe("bank pull lease", () => {
    it("gives a second pull one more run instead of letting both interleave", async () => {
        const t = setup();
        const id = await insertAccount(t, "user-1");
        const lease = await claimLease(t, id);

        await expect(t.mutation(internal.banking.claimPull, { id })).resolves.toBeNull();
        await expect(
            t.mutation(internal.banking.advanceCursor, { from: null, id, lease, to: "c1" })
        ).resolves.toBeTruthy();

        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name === "banking:pull")).toHaveLength(1);
        await expect(t.run((ctx) => ctx.db.get(id))).resolves.toMatchObject({ cursor: "c1" });
    });

    it("drops a chunk queued under a lease the account no longer holds", async () => {
        const t = setup();
        const id = await insertAccount(t, "user-1");
        const lease = await claimLease(t, id);
        const writes = [{ amount: 1, date: 1, income: false, note: "queued" }];

        await expect(
            t.mutation(internal.banking.queueWrites, { id, lease: "another-pull", writes })
        ).resolves.toBeFalsy();
        await expect(t.run((ctx) => ctx.db.query("inboundWrites").collect())).resolves.toHaveLength(0);

        await expect(t.mutation(internal.banking.queueWrites, { id, lease, writes })).resolves.toBeTruthy();
        await expect(t.run((ctx) => ctx.db.query("inboundWrites").collect())).resolves.toHaveLength(1);
    });
});

describe("bank pull backpressure", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: BANKING_EFFECTIVE_AT_MS + 86_400_000 });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("leaves the cursor and the provider alone while the phone still has a full inbox", async () => {
        configureStripe();
        const t = setup();
        const identity = await seedAuthUser(t);
        await syncEntitlement(t, identity.userId, new Date(Date.now() + 86_400_000).toISOString());
        const id = await t.run(async (ctx) => {
            for (let n = 0; n < MAX_INBOX; n += 1) {
                await ctx.db.insert("inboundWrites", {
                    receivedAt: n,
                    userId: identity.userId,
                    write: { amount: 1, date: n, income: false, note: "queued" },
                });
            }
            return await ctx.db.insert("bankAccounts", {
                accountId: "acct_1",
                institution: "Bank",
                kind: "cash",
                last4: "4242",
                linkedAt: 1,
                name: "Checking",
                provider: "stripe",
                status: "active",
                userId: identity.userId,
            });
        });
        const fetchMock = vi.fn(async () => Response.json({}));
        vi.stubGlobal("fetch", fetchMock);

        await expect(t.action(internal.banking.pull, { id })).resolves.toBeNull();

        expect(fetchMock).not.toHaveBeenCalled();
        const row = await t.run((ctx) => ctx.db.get(id));
        expect(row?.cursor).toBeUndefined();
    });
});

describe("bank writes during deletion", () => {
    it("queues nothing for an account whose user is being deleted", async () => {
        const t = setup();
        const id = await insertAccount(t, "user-1");
        const lease = await claimLease(t, id);
        await t.run((ctx) =>
            ctx.db.insert("accountDeletionJobs", {
                errorCode: null,
                expiresAt: Date.now() + 60_000,
                googleReceiptChallengeHash: null,
                googleReceiptDigest: null,
                phase: "providersRevoked",
                provider: "credentialOnly",
                secretHash: "hash",
                userId: "user-1",
            })
        );

        await expect(
            t.mutation(internal.banking.queueWrites, {
                id,
                lease,
                writes: [{ amount: 1, date: 1, income: false, note: "queued" }],
            })
        ).resolves.toBeFalsy();

        await expect(t.run((ctx) => ctx.db.query("inboundWrites").collect())).resolves.toHaveLength(0);
    });
});

describe("bank events", () => {
    it("ignores an event for an account this deployment never linked", async () => {
        const t = setup();

        await expect(
            t.mutation(internal.banking.onEvent, {
                accountId: "acct_unknown",
                kind: "transactions",
                provider: "stripe",
            })
        ).resolves.toBeNull();
        await expect(t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())).resolves.toStrictEqual([]);
    });
});

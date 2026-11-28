/// <reference types="vite/client" />

import type { BankAccount, Institution } from "@outlayr/banking/provider";
import { BankingError } from "@outlayr/banking/provider";
import { bankingProviders } from "@outlayr/banking/registry";
import { PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import { LEDGER_CELLS_VERSION } from "@outlayr/money/ledger-cells";
import { RevenueCat } from "convex-revenuecat";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { WithoutSystemFields } from "convex/server";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { api, components, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { toBankEntry } from "./banking";
import { rankInstitutions } from "./banking.impl";
import { PURGE_BATCH } from "./lib/account";
import { incomingWins } from "./lib/syncTables";
import { keyedLocalId } from "./mcpEntries";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

type TestClient = ReturnType<typeof setup>;
type Row<Table extends "accounts" | "categories"> = WithoutSystemFields<Doc<Table>>;
type Tx = Parameters<typeof toBankEntry>[1];

const at = (iso: string) => Date.parse(iso);
const NOW = at("2027-01-05T15:00:00Z");

let seq = 0;
const envelope = (localId: string, userId: string) => {
    seq += 1;
    return { deletedAt: null, deviceId: "phone", localId, seq, updatedAt: 1, userId };
};

const categoryRow = (userId: string, localId: string, name: string, income = false): Row<"categories"> => ({
    ...envelope(localId, userId),
    color: null,
    dateCreated: null,
    emoji: null,
    icon: null,
    income,
    name,
    parentId: null,
    sortOrder: 0,
});

const accountRow = (userId: string, localId: string, fields: Partial<Row<"accounts">> = {}): Row<"accounts"> => ({
    ...envelope(localId, userId),
    currency: "USD",
    customColor: null,
    dateCreated: 0,
    emoji: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    initialBalance: 0,
    initialBalanceDate: 0,
    initialBalanceUsd: 0,
    kind: "asset",
    name: localId,
    sortOrder: 0,
    ...fields,
});

function setup() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    return t;
}

interface LedgerSeed {
    accounts?: Row<"accounts">[];
    categories?: Row<"categories">[];
    sync?: boolean;
}

const seedLedger = (t: TestClient, userId: string, seed: LedgerSeed = {}) =>
    t.run(async (ctx) => {
        for (const row of seed.categories ?? [
            categoryRow(userId, "groceries", "Groceries"),
            categoryRow(userId, "salary", "Salary", true),
        ]) {
            await ctx.db.insert("categories", row);
        }
        for (const row of seed.accounts ?? [accountRow(userId, "checking")]) {
            await ctx.db.insert("accounts", row);
        }
        if (seed.sync !== false) {
            await ctx.db.insert("syncState", {
                cells: { building: false, run: 0, version: LEDGER_CELLS_VERSION },
                nextSeq: 1000,
                userId,
            });
        }
    });

const insertBank = (t: TestClient, userId: string, overrides: Partial<WithoutSystemFields<Doc<"bankAccounts">>> = {}) =>
    t.run((ctx) =>
        ctx.db.insert("bankAccounts", {
            accountId: "acct_1",
            filesInto: "checking",
            institution: "Chase",
            kind: "credit",
            last4: "9999",
            linkedAt: 1,
            name: "Sapphire",
            provider: "stripe",
            status: "active",
            userId,
            ...overrides,
        })
    );

const claimLease = async (t: TestClient, id: Awaited<ReturnType<typeof insertBank>>) => {
    const lease = await t.mutation(internal.banking.claimPull, { id });
    if (lease === null) {
        throw new Error("expected claimPull to hand out a lease");
    }
    return lease;
};

const institutionRow = (
    overrides: Partial<WithoutSystemFields<Doc<"bankInstitutions">>> = {}
): WithoutSystemFields<Doc<"bankInstitutions">> => ({
    catchAll: false,
    country: "US",
    externalId: "ins_1",
    logo: null,
    name: "Chase",
    popularity: 0,
    provider: "stripe",
    retired: false,
    seenAt: 1,
    ...overrides,
});

const bank = (overrides: Partial<Tx> = {}): Tx => ({
    accountId: "acct_1",
    amountMinor: -1234,
    currency: "USD",
    description: "Coffee",
    id: "tx_1",
    status: "posted" as const,
    transactedAt: at("2027-01-03T15:00:00Z"),
    ...overrides,
});

const file = (t: TestClient, id: Awaited<ReturnType<typeof insertBank>>, lease: string, txs: Tx[]) =>
    t.mutation(internal.banking.fileTransactions, { id, lease, txs });

const localIdOf = async (userId: string, key: string) => Effect.runPromise(keyedLocalId(userId, key));

const storedEntry = (t: TestClient, userId: string, localId: string) =>
    t.run((ctx) =>
        ctx.db
            .query("transactions")
            .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", localId))
            .unique()
    );

type TxRow = WithoutSystemFields<Doc<"transactions">>;

const transactionRow = (userId: string, localId: string, fields: Partial<TxRow> = {}): TxRow => ({
    ...envelope(localId, userId),
    accountId: "checking",
    amount: 12.34,
    amountUsd: 12.34,
    categoryId: "groceries",
    currency: "USD",
    customColor: null,
    date: at("2027-01-03T15:00:00Z"),
    day: at("2027-01-03T00:00:00Z"),
    details: null,
    emoji: null,
    exchangeRate: 1,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: at("2027-01-01T00:00:00Z"),
    note: "Coffee",
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...fields,
});

const insertEntry = (t: TestClient, row: TxRow) => t.run((ctx) => ctx.db.insert("transactions", row));

const bankRecord = (t: TestClient, userId: string, key: string) =>
    t.run((ctx) =>
        ctx.db
            .query("bankEntries")
            .withIndex("by_userId", (q) => q.eq("userId", userId).eq("key", key))
            .unique()
    );

const nextSeqOf = (t: TestClient, userId: string) =>
    t.run((ctx) =>
        ctx.db
            .query("syncState")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique()
    );

const syncEntitlement = async (t: TestClient, userId: string, expiresDate: string | null) => {
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

const stripeFetch = () =>
    vi.fn(async (input: RequestInfo | URL) => {
        let url: string;
        if (typeof input === "string") {
            url = input;
        } else if (input instanceof URL) {
            url = input.toString();
        } else {
            ({ url } = input);
        }
        if (url.includes("/financial_connections/transactions")) {
            return Response.json({
                data: [
                    {
                        account: "acct_1",
                        amount: -1234,
                        currency: "USD",
                        description: "Coffee",
                        id: "tx_1",
                        status: "posted",
                        transacted_at: at("2027-01-04T15:00:00Z") / 1000,
                    },
                ],
                has_more: false,
            });
        }
        return Response.json({
            category: "cash",
            display_name: "Checking",
            id: "acct_1",
            institution_name: "Bank",
            last4: "4242",
            status: "active",
            subscriptions: ["transactions"],
            transaction_refresh: { id: "refresh_1", status: "succeeded" },
        });
    });

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("bank transaction to entry", () => {
    it("turns cents into the currency's major unit and counts a debit as an expense", () => {
        expect(toBankEntry("stripe", bank())).toMatchObject({
            amount: 12.34,
            currency: "USD",
            income: false,
        });
    });

    it("uses the currency's own decimals", () => {
        expect(toBankEntry("stripe", bank({ amountMinor: -500, currency: "JPY" }))).toMatchObject({
            amount: 500,
            currency: "JPY",
        });
        expect(toBankEntry("stripe", bank({ amountMinor: -1234, currency: "KWD" }))).toMatchObject({
            amount: 1.234,
            currency: "KWD",
        });
    });

    it("files a positive amount as income", () => {
        expect(toBankEntry("stripe", bank({ amountMinor: 2500 }))).toMatchObject({
            amount: 25,
            income: true,
        });
    });

    it("drops a transaction with nothing to file", () => {
        expect(toBankEntry("stripe", bank({ amountMinor: 0, status: "posted" }))).toBeNull();
    });

    it("keeps a zero-amount void so the entry can be removed", () => {
        expect(toBankEntry("stripe", bank({ amountMinor: 0, status: "void" }))).toMatchObject({
            amount: 0,
            status: "void",
        });
    });

    it("keys every entry by provider and transaction so a replay updates one row", () => {
        expect(toBankEntry("stripe", bank())?.key).toBe("bank:stripe:tx_1");
    });
});

describe("bank filing", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("files a first pull into the Personal ledger and moves the cursor past it", async () => {
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId);
        const id = await t.run((ctx) =>
            ctx.db.insert("bankAccounts", {
                accountId: "acct_1",
                institution: "Bank",
                kind: "cash",
                last4: "4242",
                linkedAt: 1,
                name: "Checking",
                provider: "stripe",
                filesInto: "checking",
                status: "active",
                userId: owner.userId,
            })
        );
        vi.stubGlobal("fetch", stripeFetch());

        await expect(t.action(internal.banking.pull, { id })).resolves.toBeNull();

        const row = await t.run((ctx) => ctx.db.get(id));
        expect(row).toMatchObject({ cursor: "refresh_1" });
        expect(row?.pulledAt).toBeGreaterThanOrEqual(NOW);
        const entries = await t.run((ctx) =>
            ctx.db
                .query("transactions")
                .withIndex("by_user_and_seq", (q) => q.eq("userId", owner.userId))
                .collect()
        );
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            accountId: "checking",
            amount: 12.34,
            amountUsd: 12.34,
            categoryId: "groceries",
            createdBy: null,
            currency: "USD",
            date: at("2027-01-04T15:00:00Z"),
            day: at("2027-01-04T00:00:00Z"),
            deviceId: "bank",
            income: false,
            month: at("2027-01-01T00:00:00Z"),
            note: "Coffee",
            seq: 1000,
        });
        expect(entries[0]?.updatedAt).toBeGreaterThanOrEqual(NOW);
        await expect(t.run((ctx) => ctx.db.query("inboundWrites").collect())).resolves.toHaveLength(0);
        expect((await nextSeqOf(t, owner.userId))?.nextSeq).toBe(1001);
        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name === "ledgerCells:refresh")).toHaveLength(1);
    });

    it("writes nothing when a page is replayed", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await expect(file(t, id, lease, [bank()])).resolves.toBeTruthy();
        const first = await storedEntry(t, "user-1", await localIdOf("user-1", "bank:stripe:tx_1"));
        const before = (await nextSeqOf(t, "user-1"))?.nextSeq;

        await expect(file(t, id, lease, [bank()])).resolves.toBeTruthy();

        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(before);
        await expect(storedEntry(t, "user-1", first?.localId ?? "")).resolves.toMatchObject({
            updatedAt: first?.updatedAt,
        });
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(1);
    });

    it("moves a posted update over the fields the user has not edited and stamps the row past itself", async () => {
        const t = setup();
        await seedLedger(t, "user-1", {
            categories: [categoryRow("user-1", "groceries", "Groceries"), categoryRow("user-1", "dining", "Dining")],
        });
        await t.run((ctx) =>
            ctx.db.insert("transactions", {
                ...envelope("seen-before", "user-1"),
                accountId: null,
                amount: 9,
                amountUsd: 9,
                categoryId: "dining",
                currency: "USD",
                customColor: null,
                date: at("2027-01-01T00:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                details: null,
                emoji: null,
                exchangeRate: 1,
                exchangeRateType: null,
                icon: null,
                imageColor: null,
                imageKey: null,
                income: false,
                month: at("2027-01-01T00:00:00Z"),
                note: "Coffee",
                onceRecurring: false,
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: 0,
            } satisfies WithoutSystemFields<Doc<"transactions">>)
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [
            bank({ amountMinor: -1000, status: "pending", transactedAt: at("2027-01-03T15:00:00Z") }),
        ]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) => ctx.db.patch(first?._id ?? fail("expected the first entry"), { updatedAt: 500 }));

        await file(t, id, lease, [bank({ amountMinor: -1200, transactedAt: at("2027-01-04T15:00:00Z") })]);

        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({
            accountId: "checking",
            amount: 12,
            amountUsd: 12,
            categoryId: "dining",
            date: at("2027-01-04T15:00:00Z"),
            day: at("2027-01-04T00:00:00Z"),
            month: at("2027-01-01T00:00:00Z"),
            seq: 1001,
            updatedAt: 501,
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1002);
    });

    it("leaves a field the user edited alone while the rest follows the bank", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ amountMinor: -1234 })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), { amount: 10, updatedAt: 600 })
        );

        await file(t, id, lease, [bank({ amountMinor: -2000, transactedAt: at("2027-01-04T15:00:00Z") })]);

        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({
            amount: 10,
            amountUsd: 10,
            date: at("2027-01-04T15:00:00Z"),
            updatedAt: 601,
        });
    });

    it("keeps an amount the user set when the bank later reports the same amount, then more", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ amountMinor: -1000 })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), {
                amount: 12,
                amountUsd: 12,
                updatedAt: 600,
            })
        );

        await file(t, id, lease, [bank({ amountMinor: -1200 })]);
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 12, amountUsd: 12 });

        await file(t, id, lease, [bank({ amountMinor: -1400 })]);
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 12, amountUsd: 12 });
    });

    it("applies a bank note correction after the row took the trimmed note", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ description: "  Coffee  " })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ note: "Coffee" });

        await file(t, id, lease, [bank({ description: "Coffee Shop" })]);

        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ note: "Coffee Shop" });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            note: "Coffee Shop",
            written: { note: "Coffee Shop" },
        });
    });

    it("keeps a custom rate the user set when the bank changes something else", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ amountMinor: -1000, currency: "EUR" })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), {
                amountUsd: 100,
                exchangeRate: 10,
                exchangeRateType: "custom",
                updatedAt: 400,
            })
        );

        await file(t, id, lease, [bank({ amountMinor: -1000, currency: "EUR", description: "Coffee Shop" })]);

        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({
            amountUsd: 100,
            exchangeRate: 10,
            exchangeRateType: "custom",
            note: "Coffee Shop",
            updatedAt: 401,
        });
    });

    it("never brings back an entry the user deleted", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank()]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), { deletedAt: 100, updatedAt: 100 })
        );

        await file(t, id, lease, [bank({ amountMinor: -2000 })]);
        await file(t, id, lease, [bank({ amountMinor: 0, status: "void" })]);

        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 12.34, deletedAt: 100 });
    });

    it("deletes a live entry on void and inserts nothing for an unknown void", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank()]);

        await file(t, id, lease, [bank({ amountMinor: 0, status: "void" })]);
        await file(t, id, lease, [bank({ amountMinor: 0, id: "tx_unknown", status: "void" })]);

        const entries = await t.run((ctx) => ctx.db.query("transactions").collect());
        expect(entries).toHaveLength(1);
        expect(entries[0]?.deletedAt).toBeGreaterThanOrEqual(NOW);
        expect(entries[0]?.seq).toBe(1001);
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(1);
    });

    it("files an income entry under the category it creates when the ledger has none", async () => {
        const t = setup();
        await seedLedger(t, "user-1", { categories: [categoryRow("user-1", "groceries", "Groceries")] });
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await expect(file(t, id, lease, [bank({ amountMinor: 5000 })])).resolves.toBeTruthy();

        const categoryLocalId = await localIdOf("user-1", "bank-category:income");
        const category = await t.run((ctx) =>
            ctx.db
                .query("categories")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", "user-1").eq("localId", categoryLocalId))
                .unique()
        );
        expect(category).toMatchObject({
            deviceId: "bank",
            income: true,
            name: "Income",
            parentId: null,
            seq: 1000,
        });
        const entry = await storedEntry(t, "user-1", await localIdOf("user-1", "bank:stripe:tx_1"));
        expect(entry).toMatchObject({ amount: 50, categoryId: categoryLocalId, income: true, seq: 1001 });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1002);
    });

    it("revives a deleted generated category ahead of the tombstone a phone still holds", async () => {
        const t = setup();
        await seedLedger(t, "user-1", { categories: [categoryRow("user-1", "salary", "Salary", true)] });
        const localId = await localIdOf("user-1", "bank-category:expense");
        await t.run((ctx) =>
            ctx.db.insert("categories", {
                ...categoryRow("user-1", localId, "Expenses"),
                deletedAt: 100,
                updatedAt: 100,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank()]);

        const revived = await t.run((ctx) =>
            ctx.db
                .query("categories")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", "user-1").eq("localId", localId))
                .unique()
        );
        expect(revived).toMatchObject({ deletedAt: null, deviceId: "bank" });
        expect(revived?.restoredAt ?? 0).toBeGreaterThanOrEqual(NOW);
        expect(revived?.restoredAt ?? 0).toBeGreaterThan(100);
        expect(incomingWins({ deletedAt: 100, deviceId: "phone", updatedAt: 100 }, revived)).toBeFalsy();
    });

    it("refuses to file into a ledger with no categories yet, so the cursor stays", async () => {
        const t = setup();
        await seedLedger(t, "user-1", { categories: [] });
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await expect(file(t, id, lease, [bank()])).resolves.toBeFalsy();

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1000);
    });

    it("lets a phone edit pushed after a bank update win the whole row", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId);
        const id = await insertBank(t, owner.userId);
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank()]);
        const localId = await localIdOf(owner.userId, "bank:stripe:tx_1");
        const first = await storedEntry(t, owner.userId, localId);
        if (!first) {
            throw new Error("expected the bank entry");
        }

        await authenticatedAs(t, owner).mutation(api.sync.push, {
            deviceId: "phone",
            rows: [
                {
                    deletedAt: null,
                    fields: {
                        accountId: first.accountId ?? null,
                        amount: 99,
                        amountUsd: 99,
                        categoryId: first.categoryId,
                        currency: "USD",
                        customColor: null,
                        date: first.date,
                        day: first.day,
                        details: null,
                        emoji: null,
                        exchangeRate: 1,
                        exchangeRateType: null,
                        icon: null,
                        imageColor: null,
                        imageKey: null,
                        income: false,
                        month: first.month,
                        note: "Coffee",
                        onceRecurring: false,
                        recurringCoefficient: 1,
                        recurringEndDate: null,
                        recurringType: 0,
                    },
                    localId,
                    table: "transactions",
                    updatedAt: first.updatedAt + 1,
                },
            ],
        });

        await expect(storedEntry(t, owner.userId, localId)).resolves.toMatchObject({ amount: 99, deviceId: "phone" });
    });
});

describe("bank transaction linking", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("links the Apple Pay row the user already logged instead of filing a second one", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank()]);

        const rows = await t.run((ctx) => ctx.db.query("transactions").collect());
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            amount: 12.34,
            categoryId: "groceries",
            date: at("2027-01-02T15:00:00Z"),
            deviceId: "phone",
            localId: "apple-pay",
            note: "Coffee",
            updatedAt: 1,
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "apple-pay",
            origin: "linked",
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1000);
    });

    it("files a new row when the user's row is outside the match window", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "old-coffee", {
                date: at("2026-12-29T15:00:00Z"),
                day: at("2026-12-29T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank()]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: await localIdOf("user-1", "bank:stripe:tx_1"),
            origin: "filed",
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1001);
    });

    it("files a new row when the currency or the direction differs", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ currency: "EUR", id: "tx_1" }), bank({ amountMinor: 1234, id: "tx_2" })]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(3);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({ origin: "filed" });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_2")).resolves.toMatchObject({ origin: "filed" });
    });

    it("leaves a row already linked to one bank transaction alone", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ id: "tx_1" })]);
        await file(t, id, lease, [bank({ id: "tx_2" })]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "apple-pay",
            origin: "linked",
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_2")).resolves.toMatchObject({
            localId: await localIdOf("user-1", "bank:stripe:tx_2"),
            origin: "filed",
        });
    });

    it("prefers the merchant match over a closer date", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "bookstore", {
                date: at("2027-01-03T15:00:00Z"),
                day: at("2027-01-03T00:00:00Z"),
                note: "Bookstore",
            })
        );
        await insertEntry(
            t,
            transactionRow("user-1", "coffee", {
                date: at("2027-01-01T15:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                note: "Blue Coffee",
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank()]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "coffee",
            origin: "linked",
        });
        await expect(storedEntry(t, "user-1", "bookstore")).resolves.toMatchObject({
            date: at("2027-01-03T15:00:00Z"),
            note: "Bookstore",
        });
    });

    it("files a linked row into the bank's account and gives it a fresh seq", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                accountId: null,
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
                updatedAt: 5,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank()]);

        await expect(storedEntry(t, "user-1", "apple-pay")).resolves.toMatchObject({
            accountId: "checking",
            amount: 12.34,
            date: at("2027-01-02T15:00:00Z"),
            seq: 1000,
            updatedAt: 6,
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1001);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "apple-pay",
            origin: "linked",
        });
    });

    it("settles a repriced subscription occurrence instead of filing a second charge", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "streaming", {
                amount: 9.99,
                amountUsd: 9.99,
                date: at("2027-01-01T15:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                note: "Streaming",
                onceRecurring: true,
                recurringType: 3,
                updatedAt: 7,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ amountMinor: -1299, description: "Streaming" })]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(1);
        await expect(storedEntry(t, "user-1", "streaming")).resolves.toMatchObject({
            amount: 12.99,
            amountUsd: 12.99,
            date: at("2027-01-03T15:00:00Z"),
            day: at("2027-01-03T00:00:00Z"),
            month: at("2027-01-01T00:00:00Z"),
            note: "Streaming",
            seq: 1000,
            updatedAt: 8,
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            amount: 12.99,
            date: at("2027-01-03T15:00:00Z"),
            localId: "streaming",
            origin: "linked",
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1001);
    });

    it("files a new row when a price change is not the same merchant", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "streaming", {
                amount: 9.99,
                amountUsd: 9.99,
                date: at("2027-01-01T15:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                note: "Streaming",
                onceRecurring: true,
                recurringType: 3,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ amountMinor: -1299, description: "Coffee" })]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: await localIdOf("user-1", "bank:stripe:tx_1"),
            origin: "filed",
        });
    });

    it("files a new row when the merchant only shares a word with a recurring one", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple", {
                amount: 8,
                amountUsd: 8,
                date: at("2027-01-01T15:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                note: "Apple",
                onceRecurring: true,
                recurringType: 3,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ amountMinor: -1200, description: "Pineapple" })]);

        await expect(storedEntry(t, "user-1", "apple")).resolves.toMatchObject({
            amount: 8,
            date: at("2027-01-01T15:00:00Z"),
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: await localIdOf("user-1", "bank:stripe:tx_1"),
            origin: "filed",
        });
        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
    });

    it("files a repriced subscription into the bank's account when the row had none", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "streaming", {
                accountId: null,
                amount: 9.99,
                amountUsd: 9.99,
                date: at("2027-01-01T15:00:00Z"),
                day: at("2027-01-01T00:00:00Z"),
                note: "Streaming",
                onceRecurring: true,
                recurringType: 3,
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await file(t, id, lease, [bank({ amountMinor: -1299, description: "Streaming" })]);

        await expect(storedEntry(t, "user-1", "streaming")).resolves.toMatchObject({
            accountId: "checking",
            amount: 12.99,
            date: at("2027-01-03T15:00:00Z"),
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "streaming",
            origin: "linked",
            written: { amount: 12.99, date: at("2027-01-03T15:00:00Z"), note: "Streaming" },
        });
    });

    it("never deletes a linked row on void but still deletes a filed one", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ id: "tx_1" })]);
        await file(t, id, lease, [bank({ amountMinor: -500, description: "Lunch", id: "tx_2" })]);

        await file(t, id, lease, [bank({ amountMinor: 0, id: "tx_1", status: "void" })]);
        await file(t, id, lease, [bank({ amountMinor: 0, id: "tx_2", status: "void" })]);

        const linkedRow = await storedEntry(t, "user-1", "apple-pay");
        expect(linkedRow?.deletedAt).toBeNull();
        const filedRow = await storedEntry(t, "user-1", await localIdOf("user-1", "bank:stripe:tx_2"));
        expect(filedRow?.deletedAt).toBeGreaterThanOrEqual(NOW);
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            localId: "apple-pay",
            origin: "linked",
            status: "void",
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_2")).resolves.toMatchObject({
            origin: "filed",
            status: "void",
        });
    });

    it("moves a linked row's amount with the bank but keeps the date the user logged", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await insertEntry(
            t,
            transactionRow("user-1", "apple-pay", {
                date: at("2027-01-02T15:00:00Z"),
                day: at("2027-01-02T00:00:00Z"),
            })
        );
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ amountMinor: -1234, status: "pending" })]);

        await file(t, id, lease, [bank({ amountMinor: -1500, status: "posted" })]);

        await expect(storedEntry(t, "user-1", "apple-pay")).resolves.toMatchObject({
            amount: 15,
            amountUsd: 15,
            date: at("2027-01-02T15:00:00Z"),
            day: at("2027-01-02T00:00:00Z"),
            seq: 1000,
            updatedAt: 2,
        });
        await expect(bankRecord(t, "user-1", "bank:stripe:tx_1")).resolves.toMatchObject({
            amount: 15,
            date: at("2027-01-03T15:00:00Z"),
            origin: "linked",
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1001);
    });
});

const fail = (message: string): never => {
    throw new Error(message);
};

describe("bank filing guards", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("files nothing under a lease the account no longer holds", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        await claimLease(t, id);

        await expect(file(t, id, "another-pull", [bank()])).resolves.toBeFalsy();

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
    });

    it("files nothing for an account whose user is being deleted", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await t.run((ctx) =>
            ctx.db.insert("accountDeletionJobs", {
                errorCode: null,
                expiresAt: NOW + 60_000,
                googleReceiptChallengeHash: null,
                googleReceiptDigest: null,
                phase: "providersRevoked",
                provider: "credentialOnly",
                secretHash: "hash",
                userId: "user-1",
            })
        );

        await expect(file(t, id, lease, [bank()])).resolves.toBeFalsy();

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
    });

    it("keeps the cursor when the user has no synced ledger", async () => {
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId, { sync: false });
        const id = await insertBank(t, owner.userId);
        vi.stubGlobal("fetch", stripeFetch());

        await expect(t.action(internal.banking.pull, { id })).resolves.toBeNull();

        const row = await t.run((ctx) => ctx.db.get(id));
        expect(row?.cursor).toBeUndefined();
        expect(row?.pullLease).toBeUndefined();
        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("syncState").collect())).resolves.toHaveLength(0);
    });
});

describe("bank accounts", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creates an account at link time when no ledger account matches by name", async () => {
        const t = setup();
        await seedLedger(t, "user-1");

        await t.mutation(internal.banking.saveAccounts, {
            accounts: [
                {
                    id: "acct_1",
                    institution: "Chase",
                    kind: "credit",
                    last4: "9999",
                    name: "Sapphire",
                    status: "active",
                },
            ],
            provider: "stripe",
            userId: "user-1",
        });

        const localId = await localIdOf("user-1", "bank-account:stripe:acct_1");
        const row = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(row?.filesInto).toBe(localId);
        const created = await t.run((ctx) =>
            ctx.db
                .query("accounts")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", "user-1").eq("localId", localId))
                .unique()
        );
        expect(created).toMatchObject({
            currency: "USD",
            deviceId: "bank",
            kind: "liability",
            name: "Chase Sapphire ••9999",
            seq: 1000,
            updatedAt: NOW,
        });
        expect((await nextSeqOf(t, "user-1"))?.nextSeq).toBe(1001);
    });

    it("creates a new account for a card that only shares its bank with a ledger account", async () => {
        const t = setup();
        await seedLedger(t, "user-1", {
            accounts: [accountRow("user-1", "chase-checking", { name: "Chase Checking" })],
        });

        await t.mutation(internal.banking.saveAccounts, {
            accounts: [
                {
                    id: "acct_1",
                    institution: "Chase",
                    kind: "credit",
                    last4: "9999",
                    name: "Sapphire",
                    status: "active",
                },
            ],
            provider: "stripe",
            userId: "user-1",
        });

        const localId = await localIdOf("user-1", "bank-account:stripe:acct_1");
        const row = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(row?.filesInto).toBe(localId);
        const created = await t.run((ctx) =>
            ctx.db
                .query("accounts")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", "user-1").eq("localId", localId))
                .unique()
        );
        expect(created).toMatchObject({ kind: "liability", name: "Chase Sapphire ••9999" });
        await expect(t.run((ctx) => ctx.db.query("accounts").collect())).resolves.toHaveLength(2);
    });

    it("creates a new account for a card whose issuer only shares its name with a ledger account", async () => {
        const t = setup();
        await seedLedger(t, "user-1", {
            accounts: [accountRow("user-1", "chase-checking", { name: "Chase Checking" })],
        });

        await t.mutation(internal.banking.saveAccounts, {
            accounts: [
                {
                    id: "acct_1",
                    institution: "Chase",
                    kind: "credit",
                    last4: null,
                    name: "Visa",
                    status: "active",
                },
            ],
            provider: "stripe",
            userId: "user-1",
        });

        const localId = await localIdOf("user-1", "bank-account:stripe:acct_1");
        const row = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(row?.filesInto).toBe(localId);
        const created = await t.run((ctx) =>
            ctx.db
                .query("accounts")
                .withIndex("by_user_and_localId", (q) => q.eq("userId", "user-1").eq("localId", localId))
                .unique()
        );
        expect(created).toMatchObject({ name: "Chase Visa" });
        await expect(t.run((ctx) => ctx.db.query("accounts").collect())).resolves.toHaveLength(2);
    });

    it("files into a ledger account that keeps the card's last four digits", async () => {
        const t = setup();
        await seedLedger(t, "user-1", {
            accounts: [accountRow("user-1", "sapphire", { name: "Sapphire 9999" })],
        });

        await t.mutation(internal.banking.saveAccounts, {
            accounts: [
                {
                    id: "acct_1",
                    institution: "Chase",
                    kind: "credit",
                    last4: "9999",
                    name: "Sapphire",
                    status: "active",
                },
            ],
            provider: "stripe",
            userId: "user-1",
        });

        const row = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(row?.filesInto).toBe("sapphire");
        await expect(t.run((ctx) => ctx.db.query("accounts").collect())).resolves.toHaveLength(1);
    });

    it("files into a ledger account whose name matches and never creates a second one on relink", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const linked: BankAccount = {
            id: "acct_1",
            institution: "Bank",
            kind: "cash",
            last4: "4242",
            name: "checking",
            status: "active",
        };
        await t.mutation(internal.banking.saveAccounts, { accounts: [linked], provider: "stripe", userId: "user-1" });

        const row = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(row?.filesInto).toBe("checking");
        await expect(t.run((ctx) => ctx.db.query("accounts").collect())).resolves.toHaveLength(1);

        await t.mutation(internal.banking.removeAccount, { id: row?._id ?? fail("expected a linked account") });
        await t.mutation(internal.banking.saveAccounts, { accounts: [linked], provider: "stripe", userId: "user-1" });

        await expect(t.run((ctx) => ctx.db.query("accounts").collect())).resolves.toHaveLength(1);
        const relinked = await t.run((ctx) =>
            ctx.db
                .query("bankAccounts")
                .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                .unique()
        );
        expect(relinked?.filesInto).toBe("checking");
    });

    it("starts filing into a live account the user picks", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);
        await seedLedger(t, owner.userId, {
            accounts: [
                accountRow(owner.userId, "checking"),
                accountRow(owner.userId, "savings", { name: "Savings", sortOrder: 1 }),
                { ...accountRow(owner.userId, "gone"), deletedAt: 1 },
            ],
        });
        await t.run((ctx) =>
            ctx.db.insert("accounts", {
                ...accountRow(`${owner.userId}:3f8b5c1e-6b0f-4e2a-9b31-0b3c8a7d4e21`, "work"),
                name: "Work",
            })
        );
        const id = await insertBank(t, owner.userId);

        await expect(
            authenticatedAs(t, owner).mutation(api.banking.setFilesInto, { accountId: "savings", id })
        ).resolves.toBeTruthy();
        await expect(authenticatedAs(t, owner).query(api.banking.overview, {})).resolves.toMatchObject({
            accounts: [{ filesInto: "savings" }],
        });

        await expect(
            authenticatedAs(t, owner).mutation(api.banking.setFilesInto, { accountId: "gone", id })
        ).resolves.toBeFalsy();
        await expect(
            authenticatedAs(t, owner).mutation(api.banking.setFilesInto, { accountId: "checking", id })
        ).resolves.toBeTruthy();
        await expect(
            authenticatedAs(t, owner).mutation(api.banking.setFilesInto, { accountId: "work", id })
        ).resolves.toBeFalsy();
        await expect(t.run((ctx) => ctx.db.get(id))).resolves.toMatchObject({ filesInto: "checking" });
    });

    it("relinks without duplicating entries and keeps the edits made between the two links", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank(), bank({ id: "tx_2", description: "Lunch" })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), { amount: 7, updatedAt: 700 })
        );

        await t.mutation(internal.banking.removeAccount, { id });
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);

        const again = await insertBank(t, "user-1");
        const relinkedLease = await claimLease(t, again);
        await file(t, again, relinkedLease, [bank(), bank({ id: "tx_2", description: "Lunch" })]);

        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(2);
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 7, updatedAt: 700 });
        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(2);
    });

    it("keeps a user's edit when a relink replays the report the row was filed from", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank({ amountMinor: -1000 })]);
        const localId = await localIdOf("user-1", "bank:stripe:tx_1");
        const first = await storedEntry(t, "user-1", localId);
        await t.run((ctx) =>
            ctx.db.patch(first?._id ?? fail("expected the first entry"), {
                amount: 12,
                amountUsd: 12,
                updatedAt: 700,
            })
        );

        await t.mutation(internal.banking.removeAccount, { id });
        const again = await insertBank(t, "user-1");
        const relinkedLease = await claimLease(t, again);
        await file(t, again, relinkedLease, [bank({ amountMinor: -1000 })]);
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 12, amountUsd: 12 });

        await file(t, again, relinkedLease, [bank({ amountMinor: -1400 })]);
        await expect(storedEntry(t, "user-1", localId)).resolves.toMatchObject({ amount: 12, amountUsd: 12 });
    });
});

describe("bank unlink", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("deletes the records in batches and leaves the filed entries alone", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank()]);
        await t.run(async (ctx) => {
            for (let n = 0; n < PURGE_BATCH; n += 1) {
                await ctx.db.insert("bankEntries", {
                    amount: 1,
                    bankAccountId: id,
                    date: NOW,
                    key: `bank:stripe:extra_${n}`,
                    localId: `extra-${n}`,
                    note: "Extra",
                    origin: "filed",
                    status: "posted",
                    userId: "user-1",
                    written: { amount: 1, date: NOW, note: "Extra" },
                });
            }
        });

        await t.mutation(internal.banking.removeAccount, { id });
        await t.finishAllScheduledFunctions(vi.runAllTimers);

        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("bankAccounts").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(1);
    });

    it("purges the records when the account is deleted", async () => {
        const t = setup();
        const owner = await seedAuthUser(t);
        await seedLedger(t, owner.userId);
        const id = await insertBank(t, owner.userId);
        const lease = await claimLease(t, id);
        await file(t, id, lease, [bank()]);

        const { resumeSecret } = await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
        await t.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret });
        for (let step = 0; step < 20; step += 1) {
            const status = await t.mutation(api.accountDeletion.advance, { resumeSecret });
            if (status.phase === "purged") {
                break;
            }
        }

        await expect(t.run((ctx) => ctx.db.query("bankEntries").collect())).resolves.toHaveLength(0);
        await expect(t.run((ctx) => ctx.db.query("bankAccounts").collect())).resolves.toHaveLength(0);
    });

    it("gives the same provider transaction a different local id under another user", async () => {
        const t = setup();
        await seedLedger(t, "user-1");
        await seedLedger(t, "user-2");
        const first = await insertBank(t, "user-1");
        const second = await insertBank(t, "user-2");
        const firstLease = await claimLease(t, first);
        const secondLease = await claimLease(t, second);

        await file(t, first, firstLease, [bank()]);
        await file(t, second, secondLease, [bank()]);

        const rows = await t.run((ctx) => ctx.db.query("transactions").collect());
        expect(rows).toHaveLength(2);
        expect(rows[0]?.localId).not.toBe(rows[1]?.localId);
    });
});

describe("bank access", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: Date.UTC(2026, 10, 29) });
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
});

describe("bank institutions", () => {
    const failingStripe = () => {
        const original = bankingProviders.stripe;
        bankingProviders.stripe = {
            connect: original.connect.pipe(
                Config.map((client) =>
                    client.pipe(
                        Option.map((value) => ({
                            ...value,
                            institutions: () =>
                                Effect.fail(
                                    new BankingError({
                                        operation: "institutions",
                                        provider: "stripe",
                                        reason: "transport",
                                    })
                                ),
                        }))
                    )
                )
            ),
        };
        return () => {
            bankingProviders.stripe = original;
        };
    };

    const stubInstitutions = (rows: readonly Institution[]) => {
        const original = bankingProviders.stripe;
        bankingProviders.stripe = {
            connect: original.connect.pipe(
                Config.map((client) =>
                    client.pipe(Option.map((value) => ({ ...value, institutions: () => Effect.succeed(rows) })))
                )
            ),
        };
        return () => {
            bankingProviders.stripe = original;
        };
    };

    it("retires nothing when the provider's institution list fails", async () => {
        configureStripe();
        const t = setup();
        const stale = await t.run((ctx) =>
            ctx.db.insert("bankInstitutions", institutionRow({ externalId: "ins_gone", name: "Gone", popularity: 4 }))
        );
        const restore = failingStripe();
        try {
            await expect(t.action(internal.banking.syncInstitutions, {})).resolves.toBeNull();
        } finally {
            restore();
        }

        await expect(t.run((ctx) => ctx.db.get(stale))).resolves.toMatchObject({ popularity: 4, retired: false });
    });

    it("retires missing banks, revives a returning one, and keeps a row's popularity", async () => {
        configureStripe();
        const t = setup();
        const [gone, back, used] = await t.run((ctx) =>
            Promise.all([
                ctx.db.insert(
                    "bankInstitutions",
                    institutionRow({ externalId: "ins_gone", name: "Gone", popularity: 4 })
                ),
                ctx.db.insert(
                    "bankInstitutions",
                    institutionRow({
                        country: "CA",
                        externalId: "CA",
                        name: "Canadian banks (old)",
                        popularity: 7,
                        retired: true,
                        seenAt: 1,
                    })
                ),
                ctx.db.insert(
                    "bankInstitutions",
                    institutionRow({ country: "US", externalId: "US", name: "US banks", popularity: 9, seenAt: 1 })
                ),
            ])
        );

        await expect(t.action(internal.banking.syncInstitutions, {})).resolves.toBeNull();

        await expect(t.run((ctx) => ctx.db.get(gone))).resolves.toMatchObject({ retired: true });
        await expect(t.run((ctx) => ctx.db.get(back))).resolves.toMatchObject({
            name: "Canadian banks",
            popularity: 7,
            retired: false,
        });
        await expect(t.run((ctx) => ctx.db.get(used))).resolves.toMatchObject({ popularity: 9 });
        await expect(t.run((ctx) => ctx.db.query("bankInstitutions").collect())).resolves.toHaveLength(3);
    });

    it("leaves a newer run's row alone when an older run saves and retires after it", async () => {
        const t = setup();
        await t.mutation(internal.banking.saveInstitutions, {
            institutions: [{ catchAll: false, country: "US", id: "ins_1", logo: "new.png", name: "New Name" }],
            provider: "stripe",
            seenAt: 200,
        });
        await t.mutation(internal.banking.saveInstitutions, {
            institutions: [{ catchAll: false, country: "US", id: "ins_1", logo: "old.png", name: "Old Name" }],
            provider: "stripe",
            seenAt: 100,
        });
        await expect(
            t.mutation(internal.banking.retireInstitutions, { cursor: null, provider: "stripe", seenAt: 100 })
        ).resolves.toBeNull();

        const rows = await t.run((ctx) => ctx.db.query("bankInstitutions").collect());
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ logo: "new.png", name: "New Name", retired: false, seenAt: 200 });
    });

    it("keeps a row a newer run retired when an older run still lists it", async () => {
        const t = setup();
        const gone = { catchAll: false, country: "US", id: "ins_gone", logo: null, name: "Gone Bank" };
        await t.mutation(internal.banking.beginInstitutionSync, { provider: "stripe", seenAt: 50 });
        await t.mutation(internal.banking.saveInstitutions, { institutions: [gone], provider: "stripe", seenAt: 50 });
        await t.mutation(internal.banking.beginInstitutionSync, { provider: "stripe", seenAt: 200 });
        await t.mutation(internal.banking.retireInstitutions, { cursor: null, provider: "stripe", seenAt: 200 });
        await expect(
            t.mutation(internal.banking.saveInstitutions, { institutions: [gone], provider: "stripe", seenAt: 100 })
        ).resolves.toBeFalsy();

        const rows = await t.run((ctx) => ctx.db.query("bankInstitutions").collect());
        expect(rows).toMatchObject([{ retired: true }]);
    });

    it("writes nothing for an older run that saves and retires after a newer run began", async () => {
        const t = setup();
        await t.run((ctx) =>
            ctx.db.insert("bankInstitutions", institutionRow({ externalId: "ins_stale", name: "Stale", seenAt: 50 }))
        );
        const newer = { catchAll: false, country: "US", id: "ins_new", logo: null, name: "New Bank" };
        const older = { catchAll: false, country: "US", id: "ins_old", logo: null, name: "Old Bank" };
        await t.mutation(internal.banking.beginInstitutionSync, { provider: "stripe", seenAt: 100 });
        await t.mutation(internal.banking.beginInstitutionSync, { provider: "stripe", seenAt: 200 });
        await t.mutation(internal.banking.saveInstitutions, { institutions: [newer], provider: "stripe", seenAt: 200 });

        await expect(
            t.mutation(internal.banking.saveInstitutions, { institutions: [older], provider: "stripe", seenAt: 100 })
        ).resolves.toBeFalsy();
        await expect(
            t.mutation(internal.banking.retireInstitutions, { cursor: null, provider: "stripe", seenAt: 100 })
        ).resolves.toBeNull();

        const rows = await t.run((ctx) => ctx.db.query("bankInstitutions").collect());
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.externalId === "ins_old")).toBeUndefined();
        expect(rows.find((row) => row.externalId === "ins_new")).toMatchObject({ retired: false });
        expect(rows.find((row) => row.externalId === "ins_stale")).toMatchObject({ retired: false });
    });

    it("syncs one provider id in two countries into two rows and retires only the dropped country", async () => {
        configureStripe();
        const t = setup();
        vi.useFakeTimers({ now: NOW });
        try {
            const restoreBoth = stubInstitutions([
                { catchAll: false, country: "CA", id: "ins_shared", logo: null, name: "Shared Bank" },
                { catchAll: false, country: "US", id: "ins_shared", logo: null, name: "Shared Bank" },
            ]);
            try {
                await expect(t.action(internal.banking.syncInstitutions, {})).resolves.toBeNull();
            } finally {
                restoreBoth();
            }

            vi.setSystemTime(NOW + 1000);
            const restoreUs = stubInstitutions([
                { catchAll: false, country: "US", id: "ins_shared", logo: null, name: "Shared Bank" },
            ]);
            try {
                await expect(t.action(internal.banking.syncInstitutions, {})).resolves.toBeNull();
            } finally {
                restoreUs();
            }
        } finally {
            vi.useRealTimers();
        }

        const rows = await t.run((ctx) => ctx.db.query("bankInstitutions").collect());
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.country === "CA")).toMatchObject({ retired: true });
        expect(rows.find((row) => row.country === "US")).toMatchObject({ retired: false });
    });

    it("keeps a region's bank that the global search would cut off", async () => {
        const t = setup();
        const identity = await seedAuthUser(t);
        await t.run(async (ctx) => {
            for (let index = 0; index < 51; index += 1) {
                await ctx.db.insert(
                    "bankInstitutions",
                    institutionRow({ country: "CA", externalId: `ins_ca_${index}`, name: "Zeta" })
                );
            }
            await ctx.db.insert(
                "bankInstitutions",
                institutionRow({ country: "US", externalId: "ins_us", name: "Zeta Local" })
            );
        });

        const rows = await authenticatedAs(t, identity).query(api.banking.searchInstitutions, {
            q: "zeta",
            region: "US",
        });

        expect(rows).toHaveLength(51);
        expect(rows[0]).toMatchObject({ country: "US", name: "Zeta Local" });
    });

    it("refuses to start a link on a retired institution", async () => {
        vi.useFakeTimers({ now: Date.UTC(2026, 10, 29) });
        try {
            configureStripe();
            const t = setup();
            const identity = await seedProUser(t);
            const id = await t.run((ctx) => ctx.db.insert("bankInstitutions", institutionRow({ retired: true })));

            await expect(
                authenticatedAs(t, identity).action(api.banking.startLink, { institution: id, repair: null })
            ).resolves.toStrictEqual({ kind: "retired" });
        } finally {
            vi.useRealTimers();
        }
    });

    it("ranks the region's banks first and leaves the search order otherwise", () => {
        const rows = [
            { country: "CA", name: "Zed" },
            { country: "US", name: "First" },
            { country: "CA", name: "Apple" },
            { country: "US", name: "Second" },
        ];

        expect(rankInstitutions(rows, "US").map(({ name }) => name)).toStrictEqual(["First", "Second", "Zed", "Apple"]);
        expect(rankInstitutions(rows, null)).toStrictEqual(rows);
    });
});

describe("bank link", () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: Date.UTC(2026, 10, 29) });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const stubFinishLink = (accounts: readonly BankAccount[]) => {
        const original = bankingProviders.stripe;
        bankingProviders.stripe = {
            connect: original.connect.pipe(
                Config.map((client) =>
                    client.pipe(Option.map((value) => ({ ...value, finishLink: () => Effect.succeed(accounts) })))
                )
            ),
        };
        return () => {
            bankingProviders.stripe = original;
        };
    };

    it("reports only the accounts a link inserted, so relinking the same one adds none", async () => {
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId);
        await t.run((ctx) =>
            ctx.db.insert("bankHolders", { holder: "cus_1", provider: "stripe", userId: owner.userId })
        );
        const account: BankAccount = {
            id: "acct_1",
            institution: "Chase",
            kind: "credit",
            last4: "9999",
            name: "Sapphire",
            status: "active",
        };
        const restore = stubFinishLink([account]);
        try {
            const linked = await authenticatedAs(t, owner).action(api.banking.finishLink, {
                completion: null,
                provider: "stripe",
                repair: null,
                sessionId: "fcs_1",
            });
            const row = await t.run((ctx) =>
                ctx.db
                    .query("bankAccounts")
                    .withIndex("by_provider_and_accountId", (q) => q.eq("provider", "stripe").eq("accountId", "acct_1"))
                    .unique()
            );
            expect(linked).toStrictEqual({ added: [row?._id], kind: "linked", repaired: true });

            const again = await authenticatedAs(t, owner).action(api.banking.finishLink, {
                completion: null,
                provider: "stripe",
                repair: null,
                sessionId: "fcs_1",
            });
            expect(again).toStrictEqual({ added: [], kind: "linked", repaired: true });
        } finally {
            restore();
        }
    });

    it("reports a repair the link left in relink, so the app does not call it fixed", async () => {
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId);
        await t.run((ctx) =>
            ctx.db.insert("bankHolders", { holder: "cus_1", provider: "stripe", userId: owner.userId })
        );
        const repair = await insertBank(t, owner.userId, { status: "relink" });
        const restore = stubFinishLink([
            { id: "acct_2", institution: "Chase", kind: "cash", last4: "1111", name: "Checking", status: "active" },
        ]);
        try {
            const linked = await authenticatedAs(t, owner).action(api.banking.finishLink, {
                completion: null,
                provider: "stripe",
                repair,
                sessionId: "fcs_1",
            });
            expect(linked).toMatchObject({ kind: "linked", repaired: false });
        } finally {
            restore();
        }
    });

    it("reports a repair the link reactivated", async () => {
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        await seedLedger(t, owner.userId);
        await t.run((ctx) =>
            ctx.db.insert("bankHolders", { holder: "cus_1", provider: "stripe", userId: owner.userId })
        );
        const repair = await insertBank(t, owner.userId, { status: "relink" });
        const restore = stubFinishLink([
            { id: "acct_1", institution: "Chase", kind: "credit", last4: "9999", name: "Sapphire", status: "active" },
        ]);
        try {
            const linked = await authenticatedAs(t, owner).action(api.banking.finishLink, {
                completion: null,
                provider: "stripe",
                repair,
                sessionId: "fcs_1",
            });
            expect(linked).toMatchObject({ kind: "linked", repaired: true });
            await expect(t.run((ctx) => ctx.db.get(repair))).resolves.toMatchObject({ status: "active" });
        } finally {
            restore();
        }
    });

    it("refuses to repair an account that belongs to another user", async () => {
        const fetchMock = vi.fn(() => Promise.reject(new Error("unexpected provider call")));
        vi.stubGlobal("fetch", fetchMock);
        configureStripe();
        const t = setup();
        const owner = await seedProUser(t);
        const other = await seedAuthUser(t);
        const institution = await t.run((ctx) => ctx.db.insert("bankInstitutions", institutionRow()));
        const foreign = await insertBank(t, other.userId);

        await expect(
            authenticatedAs(t, owner).action(api.banking.startLink, { institution, repair: foreign })
        ).resolves.toStrictEqual({ kind: "failed" });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("bank account cursor", () => {
    it("advances only from the cursor the caller read", async () => {
        const t = setup();
        const id = await insertBank(t, "user-1");
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
        const id = await insertBank(t, "user-1");
        const lease = await claimLease(t, id);

        await expect(t.mutation(internal.banking.claimPull, { id })).resolves.toBeNull();
        await expect(
            t.mutation(internal.banking.advanceCursor, { from: null, id, lease, to: "c1" })
        ).resolves.toBeTruthy();

        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter(({ name }) => name === "banking:pull")).toHaveLength(1);
        await expect(t.run((ctx) => ctx.db.get(id))).resolves.toMatchObject({ cursor: "c1" });
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

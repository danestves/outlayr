import { beforeEach, describe, expect, it } from "@jest/globals";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import type BetterSqlite3 from "better-sqlite3";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, exchangeRates, outbox, transactions, transfers } from "@/db/schema";
import { migratedDatabase, migratedSqlite, testDatabase } from "@/db/test-database";
import { buildTransactionInput } from "@/domain/transaction-form-save";

import { META_KEYS, setMeta } from "./app-meta-core";
import { candidateLogoIds, dismissedLogoIds } from "./logo-backfill-state";
import { setSyncEnabled } from "./sync-outbox-core";
import {
    accountTransactionsQuery,
    deletedTransactionsQuery,
    getTransactionById,
    ledgerSizeQuery,
    logWindowDaysQuery,
    transactionsRepo,
} from "./transactions-core";
import type { TransactionInput } from "./transactions-core";
import { transfersRepo } from "./transfers-core";

const makeDb = () => migratedDatabase({ foreignKeys: false });

function syncedDb(): Database {
    const sqlite = migratedSqlite();
    sqlite
        .prepare(
            "INSERT INTO categories (id, name, income, sortOrder, updatedAt) VALUES ('cat-1', 'Groceries', 0, 0, 1)"
        )
        .run();
    return testDatabase(sqlite);
}

/** Older than the 90 days of history the rate feed serves. */
const LONG_AGO = new Date(Date.UTC(2020, 0, 1, 12));

const DRAFT: TransactionInput = {
    amount: 100,
    categoryId: "cat-1",
    currency: "EUR",
    date: LONG_AGO,
    details: null,
    income: false,
    note: "Bakery",
};

async function frozen(db: Database, id: string) {
    const [row] = await db
        .select({
            amount: transactions.amount,
            amountUsd: transactions.amountUsd,
            exchangeRate: transactions.exchangeRate,
            exchangeRateType: transactions.exchangeRateType,
            note: transactions.note,
        })
        .from(transactions)
        .where(eq(transactions.id, id));
    return row;
}

describe("transactionsRepo.update over a row the rates no longer reach", () => {
    let db: Database;
    let id: string;

    beforeEach(async () => {
        db = makeDb();
        await db.insert(exchangeRates).values({
            date: "2020-01-01",
            fetchedAt: LONG_AGO.getTime(),
            quote: "EUR",
            rate: 0.9,
            rateType: "official",
            source: "frankfurter",
        });
        id = await transactionsRepo.create(db, DRAFT);
        // The feed serves only the last 90 days, so once the replica is replaced this row is unvaluable again.
        await db.delete(exchangeRates);
    });

    it("keeps that value when the edit leaves the money alone", async () => {
        await transactionsRepo.update(db, id, {
            ...DRAFT,
            note: "Bakery, corner one",
        });

        const row = await frozen(db, id);
        expect(row.note).toBe("Bakery, corner one");
        expect(row.amountUsd).toBe(111.111111);
        expect(row.exchangeRate).toBe(0.9);
        expect(row.exchangeRateType).toBe("official");
    });

    it("declines to carry it onto an amount it no longer describes", async () => {
        await transactionsRepo.update(db, id, { ...DRAFT, amount: 200 });

        const row = await frozen(db, id);
        expect(row.amount).toBe(200);
        expect(row.amountUsd).toBeNull();
        expect(row.exchangeRate).toBeNull();
        expect(row.exchangeRateType).toBe("official");
    });

    it("re-freezes a changed amount whenever the rate is back", async () => {
        await db.insert(exchangeRates).values({
            date: "2020-01-01",
            fetchedAt: LONG_AGO.getTime(),
            quote: "EUR",
            rate: 0.9,
            rateType: "official",
            source: "frankfurter",
        });

        await transactionsRepo.update(db, id, { ...DRAFT, amount: 200 });

        const row = await frozen(db, id);
        expect(row.amountUsd).toBe(222.222222);
        expect(row.exchangeRate).toBe(0.9);
    });
});

describe("transactionsRepo entry-rate selections", () => {
    it("keeps a custom freeze when a real form mapper omits rate fields on an unrelated edit", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, {
            ...DRAFT,
            currency: "VES",
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        const input = buildTransactionInput({
            accountId: null,
            amount: 100,
            categoryId: "cat-1",
            coefficient: 1,
            currency: "VES",
            customColor: null,
            date: LONG_AGO,
            details: "",
            emoji: null,
            endDate: LONG_AGO,
            hasEndDate: false,
            icon: null,
            imageColor: null,
            imageUri: null,
            income: false,
            isSubscription: false,
            leadDays: null,
            note: "Renamed",
            recurringType: RECURRING_TYPE.none,
        });
        await transactionsRepo.update(db, id, input);
        await expect(frozen(db, id)).resolves.toMatchObject({
            amountUsd: 1.801802,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
    });
    async function seedRate(
        db: Database,
        quote: string,
        rateType: "official" | "eur_reference",
        rate: number
    ): Promise<void> {
        await db.insert(exchangeRates).values({
            date: "2020-01-01",
            fetchedAt: LONG_AGO.getTime(),
            quote,
            rate,
            rateType,
            source: "frankfurter",
        });
    }

    it("re-freezes when an edit changes official to custom without changing amount currency or date", async () => {
        const db = makeDb();
        await seedRate(db, "EUR", "official", 0.8);
        const id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.update(db, id, { ...DRAFT, exchangeRate: 0.5, exchangeRateType: "custom" });
        await expect(frozen(db, id)).resolves.toMatchObject({
            amountUsd: 200,
            exchangeRate: 0.5,
            exchangeRateType: "custom",
        });
    });

    it("drops the frozen USD value when an edit changes only the rate type", async () => {
        const db = makeDb();
        await seedRate(db, "EUR", "official", 0.8);
        const id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.update(db, id, { ...DRAFT, exchangeRateType: "custom" });
        await expect(frozen(db, id)).resolves.toMatchObject({
            amountUsd: null,
            exchangeRate: null,
            exchangeRateType: "custom",
        });
    });

    it("re-freezes when an edit changes only the custom actual rate", async () => {
        const db = makeDb();
        const input = { ...DRAFT, currency: "VES", exchangeRate: 50, exchangeRateType: "custom" } as const;
        const id = await transactionsRepo.create(db, input);
        await transactionsRepo.update(db, id, { ...input, exchangeRate: 40 });
        await expect(frozen(db, id)).resolves.toMatchObject({
            amountUsd: 2.5,
            exchangeRate: 40,
            exchangeRateType: "custom",
        });
    });

    it("keeps a pending custom row pending through an unrelated edit", async () => {
        const db = makeDb();
        const input = { ...DRAFT, currency: "VES", exchangeRate: null, exchangeRateType: "custom" } as const;
        const id = await transactionsRepo.create(db, input);
        await transactionsRepo.update(db, id, { ...input, note: "Updated" });
        await expect(frozen(db, id)).resolves.toMatchObject({
            amountUsd: null,
            exchangeRate: null,
            exchangeRateType: "custom",
        });
    });
});

describe("transactionsRepo.update and the replicated photo key", () => {
    const PHOTO = "file:///container/Documents/transaction-photos/a.jpg";
    const KEY = "transaction-photos/user-aaaa/a.jpg";

    async function photoColumns(db: Database, id: string) {
        const [row] = await db
            .select({
                imageKey: transactions.imageKey,
                imageUri: transactions.imageUri,
            })
            .from(transactions)
            .where(eq(transactions.id, id));
        return row;
    }

    it("clears the key when the user takes a visible photo off", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...DRAFT, imageUri: PHOTO });
        await db.update(transactions).set({ imageKey: KEY }).where(eq(transactions.id, id));

        await transactionsRepo.update(db, id, { ...DRAFT, imageUri: null });

        await expect(photoColumns(db, id)).resolves.toStrictEqual({
            imageKey: null,
            imageUri: null,
        });
    });

    it("registers a named entry saved without an identity as a logo candidate, unless told not to", async () => {
        const db = makeDb();
        const bare = await transactionsRepo.create(db, DRAFT);
        const chosen = await transactionsRepo.create(db, { ...DRAFT, emoji: "☕" });
        const photo = await transactionsRepo.create(db, { ...DRAFT, imageUri: PHOTO });
        const imported = await transactionsRepo.create(db, DRAFT, { logoCandidate: false });
        const unnamed = await transactionsRepo.create(db, { ...DRAFT, note: "  " });

        const candidates = await candidateLogoIds(db);
        expect(candidates.has(bare)).toBeTruthy();
        expect(candidates.has(chosen)).toBeFalsy();
        expect(candidates.has(photo)).toBeFalsy();
        expect(candidates.has(imported)).toBeFalsy();
        expect(candidates.has(unnamed)).toBeFalsy();
    });

    it("moves the candidate with a local edit that keeps the row bare, and makes one only for a new name", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);
        const imported = await transactionsRepo.create(db, DRAFT, { logoCandidate: false });
        const unnamed = await transactionsRepo.create(db, { ...DRAFT, note: "" });

        await transactionsRepo.update(db, id, { ...DRAFT, amount: 5 });
        await transactionsRepo.update(db, imported, { ...DRAFT, amount: 5 });
        await transactionsRepo.update(db, unnamed, { ...DRAFT, note: "Intermarche" });

        const stamps = new Map(
            (await db.select({ id: transactions.id, updatedAt: transactions.updatedAt }).from(transactions)).map(
                (row) => [row.id, row.updatedAt.getTime()]
            )
        );
        const candidates = await candidateLogoIds(db);
        expect(candidates.get(id)).toBe(stamps.get(id));
        expect(candidates.has(imported)).toBeFalsy();
        expect(candidates.get(unnamed)).toBe(stamps.get(unnamed));
    });

    it("moves the candidate when a schedule is ended or a tombstone lifted", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);
        const later = new Date("2026-09-08T10:00:00Z");

        await transactionsRepo.stopRecurring(db, id, later);
        expect((await candidateLogoIds(db)).get(id)).toBe(later.getTime());

        await transactionsRepo.remove(db, id, later);
        const lifted = new Date("2026-09-08T11:00:00Z");
        await transactionsRepo.restore(db, id, lifted);
        expect((await candidateLogoIds(db)).get(id)).toBe(lifted.getTime());
    });

    it("forgets a dismissal when the merchant changes", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...DRAFT, emoji: "☕" });

        await transactionsRepo.update(db, id, { ...DRAFT, emoji: null });
        await expect(dismissedLogoIds(db)).resolves.toStrictEqual(new Set([id]));

        await transactionsRepo.update(db, id, { ...DRAFT, note: "Intermarche" });
        await expect(dismissedLogoIds(db)).resolves.toStrictEqual(new Set());
        expect((await candidateLogoIds(db)).has(id)).toBeTruthy();
    });

    it("keeps a logo that landed while the edit was being built", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);
        // A null currency makes the edit await between its read and write; EUR keeps the merchant details unchanged.
        await setMeta(db, META_KEYS.currency, "EUR");

        const editing = transactionsRepo.update(db, id, { ...DRAFT, amount: 5, currency: null });
        await Promise.resolve();
        const painted = new Date(Date.now() + 60_000);
        await db
            .update(transactions)
            .set({ imageColor: "#123456", imageUri: PHOTO, updatedAt: painted })
            .where(eq(transactions.id, id));
        await editing;

        await expect(photoColumns(db, id)).resolves.toMatchObject({ imageUri: PHOTO });
        const [row] = await db.select({ updatedAt: transactions.updatedAt }).from(transactions);
        expect(row.updatedAt.getTime()).toBeGreaterThan(painted.getTime());
    });

    it("drops a logo that landed for the old merchant when the edit renamed it", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);

        const editing = transactionsRepo.update(db, id, { ...DRAFT, currency: null, note: "Carrefour" });
        await Promise.resolve();
        await db.update(transactions).set({ imageColor: "#123456", imageUri: PHOTO }).where(eq(transactions.id, id));
        await editing;

        await expect(photoColumns(db, id)).resolves.toMatchObject({ imageUri: null });
    });

    it("lets a tint chosen in the edit win over a logo that landed meanwhile", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);

        const editing = transactionsRepo.update(db, id, { ...DRAFT, currency: null, customColor: "#abcdef" });
        await Promise.resolve();
        await db.update(transactions).set({ imageColor: "#123456", imageUri: PHOTO }).where(eq(transactions.id, id));
        await editing;

        await expect(photoColumns(db, id)).resolves.toMatchObject({ imageUri: null });
    });

    it("leaves the candidate where it was when the edit itself fails", async () => {
        const db = makeDb();
        // Without an async transaction API `withTransaction` runs bare, making this rollback assertion vacuous.
        const sqlite = db.$client as unknown as BetterSqlite3.Database;
        Object.assign(db.$client as object, {
            withTransactionAsync: async (task: () => Promise<void>) => {
                sqlite.exec("BEGIN");
                try {
                    await task();
                    sqlite.exec("COMMIT");
                } catch (error) {
                    sqlite.exec("ROLLBACK");
                    throw error;
                }
            },
        });
        const id = await transactionsRepo.create(db, DRAFT);
        const before = (await candidateLogoIds(db)).get(id);

        await expect(transactionsRepo.update(db, id, { ...DRAFT, amount: Number.NaN })).rejects.toThrow();

        expect((await candidateLogoIds(db)).get(id)).toBe(before);
    });

    it("keeps every candidate when saves overlap", async () => {
        const db = makeDb();

        const ids = await Promise.all([
            transactionsRepo.create(db, DRAFT),
            transactionsRepo.create(db, { ...DRAFT, note: "Coffee" }),
            transactionsRepo.create(db, { ...DRAFT, note: "Metro" }),
        ]);

        const candidates = await candidateLogoIds(db);
        for (const id of ids) {
            expect(candidates.has(id)).toBeTruthy();
        }
    });

    it("records a removal so the logo backfill leaves the row alone", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...DRAFT, imageUri: PHOTO });

        await transactionsRepo.update(db, id, { ...DRAFT, imageUri: null });

        await expect(dismissedLogoIds(db)).resolves.toStrictEqual(new Set([id]));
    });

    it("records clearing an emoji or a tint too, and not an ordinary edit", async () => {
        const db = makeDb();
        const emoji = await transactionsRepo.create(db, { ...DRAFT, emoji: "☕" });
        const tint = await transactionsRepo.create(db, { ...DRAFT, customColor: "#123456" });
        const plain = await transactionsRepo.create(db, DRAFT);

        await transactionsRepo.update(db, emoji, { ...DRAFT, emoji: null });
        await transactionsRepo.update(db, tint, { ...DRAFT, customColor: null });
        await transactionsRepo.update(db, plain, { ...DRAFT, note: "Renamed" });

        await expect(dismissedLogoIds(db)).resolves.toStrictEqual(new Set([emoji, tint]));
    });

    it("keeps the key when the row's bytes have not reached this device", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);
        await db.update(transactions).set({ imageKey: KEY }).where(eq(transactions.id, id));

        await transactionsRepo.update(db, id, { ...DRAFT, note: "Renamed" });

        expect((await photoColumns(db, id)).imageKey).toBe(KEY);
    });

    it("keeps the superseded key when the photo is replaced, for the uploader to release", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...DRAFT, imageUri: PHOTO });
        await db.update(transactions).set({ imageKey: KEY }).where(eq(transactions.id, id));

        await transactionsRepo.update(db, id, {
            ...DRAFT,
            imageUri: "file:///container/Documents/transaction-photos/b.jpg",
        });

        expect((await photoColumns(db, id)).imageKey).toBe(KEY);
    });
});

describe("the reminder notice on a subscription", () => {
    const NOW = new Date(2026, 3, 1, 9, 0);
    const SUBSCRIPTION: TransactionInput = {
        amount: 12,
        categoryId: "cat-1",
        currency: "USD",
        date: new Date(2026, 2, 15),
        details: null,
        income: false,
        note: "Netflix",
        onceRecurring: true,
        recurringCoefficient: 1,
        recurringType: RECURRING_TYPE.monthly,
        reminderLeadDays: 3,
    };

    async function notices(db: Database) {
        return db
            .select({
                deletedAt: transactions.deletedAt,
                id: transactions.id,
                reminderLeadDays: transactions.reminderLeadDays,
            })
            .from(transactions);
    }

    it("hands the notice to the successor and clears it on the tombstone", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);

        await transactionsRepo.remove(db, id, NOW);

        const rows = await notices(db);
        expect(rows.find((row) => row.id === id)?.reminderLeadDays).toBeNull();
        const successor = rows.find((row) => row.id !== id);
        expect(successor?.deletedAt).toBeNull();
        expect(successor?.reminderLeadDays).toBe(3);
    });

    it("registers the successor it creates as a logo candidate", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);

        await transactionsRepo.remove(db, id, NOW);

        const successor = (await notices(db)).find((row) => row.id !== id);
        expect(successor).toBeDefined();
        expect((await candidateLogoIds(db)).has(successor?.id ?? "")).toBeTruthy();
    });

    it("clears the notice when the schedule is stopped", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);

        await transactionsRepo.stopRecurring(db, id, NOW);

        const [row] = await notices(db);
        expect(row?.reminderLeadDays).toBeNull();
    });

    it("writes no notice on a transaction that does not recur", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, {
            ...SUBSCRIPTION,
            onceRecurring: false,
            recurringType: RECURRING_TYPE.none,
        });

        const [row] = await notices(db);
        expect(row?.id).toBe(id);
        expect(row?.reminderLeadDays).toBeNull();
    });

    it("keeps a same-day notice distinct from no notice", async () => {
        const db = makeDb();
        const sameDay = await transactionsRepo.create(db, {
            ...SUBSCRIPTION,
            reminderLeadDays: 0,
        });
        const off = await transactionsRepo.create(db, {
            ...SUBSCRIPTION,
            reminderLeadDays: undefined,
        });

        const rows = await notices(db);
        expect(rows.find((row) => row.id === sameDay)?.reminderLeadDays).toBe(0);
        expect(rows.find((row) => row.id === off)?.reminderLeadDays).toBeNull();
    });

    it("keeps the notice through an edit that never mentions it", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);
        const { reminderLeadDays: _absent, ...silentEdit } = SUBSCRIPTION;

        await transactionsRepo.update(db, id, { ...silentEdit, amount: 13 });

        const [row] = await notices(db);
        expect(row?.reminderLeadDays).toBe(3);
    });

    it("turns the notice off when an edit says null", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);

        await transactionsRepo.update(db, id, {
            ...SUBSCRIPTION,
            reminderLeadDays: null,
        });

        const [row] = await notices(db);
        expect(row?.reminderLeadDays).toBeNull();
    });

    it("drops the notice when an edit ends the subscription", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, SUBSCRIPTION);
        const { reminderLeadDays: _absent, ...silentEdit } = SUBSCRIPTION;

        await transactionsRepo.update(db, id, {
            ...silentEdit,
            onceRecurring: false,
            recurringType: RECURRING_TYPE.none,
        });

        const [row] = await notices(db);
        expect(row?.reminderLeadDays).toBeNull();
    });
});

describe("restoring a tombstoned transaction", () => {
    const DELETED_AT = new Date(2026, 3, 1, 9, 0);
    const RESTORED_AT = new Date(2026, 3, 2, 8, 30);

    async function timestamps(database: Database, transactionId: string) {
        const [row] = await database
            .select({
                deletedAt: transactions.deletedAt,
                recurringType: transactions.recurringType,
                reminderLeadDays: transactions.reminderLeadDays,
                updatedAt: transactions.updatedAt,
            })
            .from(transactions)
            .where(eq(transactions.id, transactionId));
        return row;
    }

    let db: Database;
    let id: string;

    beforeEach(async () => {
        db = makeDb();
        id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.remove(db, id, DELETED_AT);
    });

    it("puts the entry back in every read that hides tombstones", async () => {
        await expect(ledgerSizeQuery(db)).resolves.toStrictEqual([]);

        await transactionsRepo.restore(db, id, RESTORED_AT);

        expect((await ledgerSizeQuery(db)).map((row) => row.id)).toStrictEqual([id]);
        await expect(logWindowDaysQuery(db, Date.now(), 30)).resolves.toHaveLength(1);
    });

    it("moves updatedAt, so a peer is told the row came back", async () => {
        await transactionsRepo.restore(db, id, RESTORED_AT);

        const row = await timestamps(db, id);
        expect(row?.deletedAt).toBeNull();
        expect(row?.updatedAt.getTime()).toBe(RESTORED_AT.getTime());
    });

    it("leaves a subscription the delete ended ended", async () => {
        const carrier = await transactionsRepo.create(db, {
            ...DRAFT,
            onceRecurring: true,
            recurringCoefficient: 1,
            recurringType: RECURRING_TYPE.monthly,
            reminderLeadDays: 3,
        });
        await transactionsRepo.remove(db, carrier, DELETED_AT);

        await transactionsRepo.restore(db, carrier, RESTORED_AT);

        const row = await timestamps(db, carrier);
        expect(row?.recurringType).toBe(RECURRING_TYPE.none);
        expect(row?.reminderLeadDays).toBeNull();
    });
});

describe("a restore the account has to hear about", () => {
    const DELETED_AT = new Date(2026, 3, 1, 9, 0);
    const RESTORED_AT = new Date(2026, 3, 2, 8, 30);
    const LATER_STILL = new Date(2026, 3, 3, 8, 30);

    async function queued(db: Database) {
        return db
            .select({
                localId: outbox.localId,
                seq: outbox.seq,
                tableName: outbox.tableName,
            })
            .from(outbox);
    }

    it("queues the row it brought back", async () => {
        const db = syncedDb();
        const id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.remove(db, id, DELETED_AT);
        await setSyncEnabled(db, true);

        await transactionsRepo.restore(db, id, RESTORED_AT);

        expect((await queued(db)).map((row) => [row.tableName, row.localId])).toStrictEqual([["transactions", id]]);
    });

    it("queues nothing for a restore that had nothing to lift", async () => {
        const db = syncedDb();
        const id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.remove(db, id, DELETED_AT);
        await setSyncEnabled(db, true);
        await transactionsRepo.restore(db, id, RESTORED_AT);
        const first = (await queued(db))[0]?.seq;

        await transactionsRepo.restore(db, id, LATER_STILL);

        expect((await queued(db))[0]?.seq).toBe(first);
    });
});

describe("the fee on a transfer the user deleted", () => {
    const WHEN = new Date(Date.UTC(2026, 5, 1, 12));
    const DELETED_AT = new Date(Date.UTC(2026, 5, 2, 9));

    async function movedWithAFee() {
        const db = syncedDb();
        await db.insert(accounts).values([
            {
                currency: "USD",
                dateCreated: WHEN,
                id: "acc-checking",
                initialBalanceDate: WHEN,
                name: "Checking",
                updatedAt: WHEN,
            },
            {
                currency: "USD",
                dateCreated: WHEN,
                id: "acc-savings",
                initialBalanceDate: WHEN,
                name: "Savings",
                updatedAt: WHEN,
            },
        ]);
        const transferId = await transfersRepo.create(db, {
            date: WHEN,
            exchangeRate: null,
            exchangeRateType: null,
            fee: { amount: 3, note: "Wire fee", side: "source" },
            fromAccountId: "acc-checking",
            fromAmount: 500,
            fromCurrency: "USD",
            toAccountId: "acc-savings",
            toAmount: 500,
            toCurrency: "USD",
        });
        const [fee] = await db
            .select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.transferId, transferId));
        return { db, feeId: fee.id, transferId };
    }

    it("takes the transfer with it when the row deleted is that transfer's fee", async () => {
        const { db, feeId, transferId } = await movedWithAFee();

        await transactionsRepo.remove(db, feeId, DELETED_AT);

        const [transfer] = await db
            .select({ deletedAt: transfers.deletedAt })
            .from(transfers)
            .where(eq(transfers.id, transferId));
        expect(transfer?.deletedAt).not.toBeNull();
        expect((await deletedTransactionsQuery(db)).map((row) => row.id)).toStrictEqual([]);
    });

    it("is not offered back on its own, while an ordinary expense still is", async () => {
        const { db, transferId } = await movedWithAFee();
        const groceries = await transactionsRepo.create(db, { ...DRAFT, currency: "USD" });
        await transactionsRepo.remove(db, groceries, DELETED_AT);

        await transfersRepo.softDelete(db, transferId, DELETED_AT);

        expect((await deletedTransactionsQuery(db)).map((row) => row.id)).toStrictEqual([groceries]);
    });

    it("stays tombstoned when a restore names it directly", async () => {
        const { db, feeId, transferId } = await movedWithAFee();
        await transfersRepo.softDelete(db, transferId, DELETED_AT);

        await transactionsRepo.restore(db, feeId, new Date(Date.UTC(2026, 5, 3, 9)));

        const [row] = await db
            .select({ deletedAt: transactions.deletedAt })
            .from(transactions)
            .where(eq(transactions.id, feeId));
        expect(row?.deletedAt?.getTime()).toBe(DELETED_AT.getTime());
    });
});

describe("switching sync off over a ledger already logged", () => {
    const DELETED_AT = new Date(2026, 3, 1, 9, 0);

    it("stops the queue without taking a row off this device", async () => {
        const db = syncedDb();
        await setSyncEnabled(db, true);
        const kept = await transactionsRepo.create(db, DRAFT);
        const tombstoned = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.remove(db, tombstoned, DELETED_AT);

        await setSyncEnabled(db, false);
        const afterOff = await transactionsRepo.create(db, DRAFT);

        await expect(db.select({ seq: outbox.seq }).from(outbox)).resolves.toStrictEqual([]);
        expect((await ledgerSizeQuery(db)).map((row) => row.id).sort()).toStrictEqual([kept, afterOff].sort());
        expect((await deletedTransactionsQuery(db)).map((row) => row.id)).toStrictEqual([tombstoned]);
    });
});

describe("the account an entry is attached to", () => {
    async function attachedTo(db: Database, id: string) {
        const [row] = await db
            .select({ accountId: transactions.accountId })
            .from(transactions)
            .where(eq(transactions.id, id));
        return row?.accountId;
    }

    it("detaches on an explicit null", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, {
            ...DRAFT,
            accountId: "acc-1",
        });

        await transactionsRepo.update(db, id, { ...DRAFT, accountId: null });

        await expect(attachedTo(db, id)).resolves.toBeNull();
    });

    it("keeps the attachment through an edit that never mentions it", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, {
            ...DRAFT,
            accountId: "acc-1",
        });

        await transactionsRepo.update(db, id, { ...DRAFT, note: "Renamed" });

        await expect(attachedTo(db, id)).resolves.toBe("acc-1");
    });
});

describe("accountTransactionsQuery", () => {
    const JUNE_1 = new Date(Date.UTC(2026, 5, 1, 12));
    const JUNE_2 = new Date(Date.UTC(2026, 5, 2, 12));

    async function seed(db: Database, id: string, overrides: Partial<typeof transactions.$inferInsert>) {
        await db.insert(transactions).values({
            amount: 10,
            currency: "USD",
            date: JUNE_1,
            day: JUNE_1,
            id,
            income: false,
            month: JUNE_1,
            note: id,
            updatedAt: JUNE_1,
            ...overrides,
        });
    }

    it("returns only the account's live rows, newest first", async () => {
        const db = makeDb();
        await seed(db, "older", { accountId: "acc-1", date: JUNE_1, day: JUNE_1 });
        await seed(db, "newer", { accountId: "acc-1", date: JUNE_2, day: JUNE_2 });
        await seed(db, "detached", { accountId: null });
        await seed(db, "other", { accountId: "acc-2" });
        await seed(db, "gone", { accountId: "acc-1", deletedAt: JUNE_2 });

        const rows = await accountTransactionsQuery(db, "acc-1");

        expect(rows.map((row) => row.id)).toStrictEqual(["newer", "older"]);
    });
});

describe("transactionsRepo.update over a row a peer has deleted", () => {
    it("keeps the tombstone rather than putting the row back", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, DRAFT);
        await transactionsRepo.remove(db, id);
        const tombstoned = getTransactionById(db, id);

        await transactionsRepo.update(db, id, { ...DRAFT, amount: 200 });

        const row = getTransactionById(db, id);
        expect(row?.deletedAt).toStrictEqual(tombstoned?.deletedAt);
        expect(row?.amount).toBe(200);
    });
});

import { beforeEach, describe, expect, it } from "@jest/globals";

import type { Database } from "@/db/client";
import {
    accounts,
    categories,
    savingsGoals,
    tags,
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
} from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { ARCHIVE_TABLES, parseArchive, serializeArchive } from "@/domain/archive";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { buildArchive, restoreArchive } from "./archive-core";
import { SYNCED_TABLES } from "./sync-outbox-core";

const CATEGORY = {
    id: "c1",
    income: false,
    name: "Food",
    sortOrder: 0,
    updatedAt: new Date(1_700_000_000_000),
};

function transactionRow(id: string, overrides: Record<string, unknown> = {}) {
    return {
        amount: 12.5,
        categoryId: "c1",
        currency: "USD",
        date: new Date(1_700_000_000_000),
        day: new Date(1_700_000_000_000),
        id,
        income: false,
        month: new Date(1_700_000_000_000),
        note: "coffee",
        updatedAt: new Date(1_700_000_000_000),
        ...overrides,
    };
}

describe("archiving a ledger", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("round-trips an account and the entry that names it", async () => {
        await db.insert(categories).values(CATEGORY);
        await db.insert(accounts).values({
            currency: "EUR",
            dateCreated: new Date(1_700_000_000_000),
            id: "a1",
            initialBalance: 250,
            initialBalanceDate: new Date(1_700_000_000_000),
            initialBalanceUsd: 270,
            name: "Checking",
            updatedAt: new Date(1_700_000_000_000),
        });
        await db.insert(transactions).values(transactionRow("t1", { accountId: "a1" }));

        const parsed = parseArchive(serializeArchive(await buildArchive(db, new Date())));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const fresh = migratedDatabase();
        await restoreArchive(fresh, parsed);

        const [account] = await fresh.select().from(accounts);
        expect(account.name).toBe("Checking");
        expect(account.initialBalance).toBe(250);
        expect(account.initialBalanceDate.getTime()).toBe(1_700_000_000_000);
        const [row] = await fresh.select().from(transactions);
        expect(row.accountId).toBe("a1");
    });

    it("carries every table the account replicates", () => {
        expect([...ARCHIVE_TABLES].sort()).toStrictEqual([...SYNCED_TABLES].sort());
    });

    it("round-trips goals, tags, splits and photos with the entry they hang off", async () => {
        const at = new Date(1_700_000_000_000);
        await db.insert(categories).values(CATEGORY);
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: at,
            id: "a1",
            initialBalance: 0,
            initialBalanceDate: at,
            name: "Savings",
            updatedAt: at,
        });
        await db.insert(transactions).values(transactionRow("t1"));
        await db.insert(savingsGoals).values({
            accountId: "a1",
            currency: "USD",
            dateCreated: at,
            id: "g1",
            name: "Trip",
            targetAmount: 900,
            targetDate: new Date(1_800_000_000_000),
            updatedAt: at,
        });
        await db.insert(tags).values({ id: "tag1", name: "work", updatedAt: at });
        await db.insert(transactionTags).values({ id: "tt1", tagId: "tag1", transactionId: "t1", updatedAt: at });
        await db.insert(transactionSplits).values({
            amount: 12.5,
            categoryId: "c1",
            id: "s1",
            transactionId: "t1",
            updatedAt: at,
        });
        await db.insert(transactionPhotos).values({
            id: "p1",
            imageKey: "photos/u1/p1.jpg",
            transactionId: "t1",
            updatedAt: at,
        });

        const parsed = parseArchive(serializeArchive(await buildArchive(db, new Date())));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const target = migratedDatabase();
        await target.insert(categories).values(CATEGORY);
        await target.insert(transactions).values(transactionRow("stale"));
        await target.insert(tags).values({ id: "stale-tag", name: "old", updatedAt: at });
        await target
            .insert(transactionTags)
            .values({ id: "stale-link", tagId: "stale-tag", transactionId: "stale", updatedAt: at });
        await restoreArchive(target, parsed);

        const [goal] = await target.select().from(savingsGoals);
        expect(goal.name).toBe("Trip");
        expect(goal.targetDate.getTime()).toBe(1_800_000_000_000);
        await expect(target.select({ id: tags.id }).from(tags)).resolves.toStrictEqual([{ id: "tag1" }]);
        await expect(target.select({ id: transactionTags.id }).from(transactionTags)).resolves.toStrictEqual([
            { id: "tt1" },
        ]);
        const [split] = await target.select().from(transactionSplits);
        expect(split.amount).toBe(12.5);
        const [photo] = await target.select().from(transactionPhotos);
        expect(photo.imageKey).toBe("photos/u1/p1.jpg");
    });

    it("forgets the key of a photo the file carries, and keeps one it does not", async () => {
        await db.insert(categories).values(CATEGORY);
        await db
            .insert(transactions)
            .values([
                transactionRow("carried", { imageKey: "photos/u1/a.jpg", imageUri: "file:///old/a.jpg" }),
                transactionRow("elsewhere", { imageKey: "photos/u1/b.jpg", imageUri: "file:///old/b.jpg" }),
            ]);

        const document = await buildArchive(db, new Date(), { "a.jpg": "AAEC" });
        const parsed = parseArchive(serializeArchive(document));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const fresh = migratedDatabase();
        await restoreArchive(fresh, parsed);

        const rows = await fresh.select({ id: transactions.id, imageKey: transactions.imageKey }).from(transactions);
        expect(Object.fromEntries(rows.map((row) => [row.id, row.imageKey]))).toStrictEqual({
            carried: null,
            elsewhere: "photos/u1/b.jpg",
        });
    });

    it("restores an instant as the same moment, not as text", async () => {
        const when = new Date(1_700_000_123_456);
        await db.insert(categories).values(CATEGORY);
        await db.insert(transactions).values(transactionRow("t1", { date: when }));

        const parsed = parseArchive(serializeArchive(await buildArchive(db, when)));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const fresh = migratedDatabase();
        await restoreArchive(fresh, parsed);

        const [row] = await fresh.select().from(transactions);
        expect(row.date instanceof Date).toBeTruthy();
        expect(row.date.getTime()).toBe(when.getTime());
    });

    it("carries a tombstone rather than dropping it", async () => {
        await db.insert(categories).values(CATEGORY);
        await db.insert(transactions).values(transactionRow("t1", { deletedAt: new Date(1_700_000_000_000) }));

        const parsed = parseArchive(serializeArchive(await buildArchive(db, new Date())));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const fresh = migratedDatabase();
        await restoreArchive(fresh, parsed);

        const [row] = await fresh.select().from(transactions);
        expect(row.deletedAt instanceof Date).toBeTruthy();
    });

    it("replaces the ledger rather than merging into it", async () => {
        await db.insert(categories).values(CATEGORY);
        await db.insert(transactions).values(transactionRow("t1"));
        const parsed = parseArchive(serializeArchive(await buildArchive(db, new Date())));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }

        const target = migratedDatabase();
        await target.insert(categories).values(CATEGORY);
        await target.insert(transactions).values(transactionRow("t2"));
        await restoreArchive(target, parsed);

        const rows = await target.select().from(transactions);
        expect(rows.map((row) => row.id)).toStrictEqual(["t1"]);
    });

    it("restores a ledger larger than one insert can bind", async () => {
        await db.insert(categories).values(CATEGORY);
        for (let i = 0; i < 250; i += 1) {
            await db.insert(transactions).values(transactionRow(`t${i}`));
        }

        const parsed = parseArchive(serializeArchive(await buildArchive(db, new Date())));
        if (!parsed) {
            throw new Error("expected the archive to parse");
        }
        const fresh = migratedDatabase();
        const written = await restoreArchive(fresh, parsed);

        expect(written).toBe(251);
        await expect(fresh.select().from(transactions)).resolves.toHaveLength(250);
    });
});

describe("archive and the device's own state", () => {
    it("leaves this device's sync identity alone through a restore", async () => {
        const source = migratedDatabase();
        await setMeta(source, META_KEYS.currency, "EUR");
        await setMeta(source, META_KEYS.syncDeviceId, "device-from-the-iphone");
        await setMeta(source, META_KEYS.syncCursor, "5000");
        const document = await buildArchive(source, new Date());

        const target = migratedDatabase();
        await setMeta(target, META_KEYS.currency, "USD");
        await setMeta(target, META_KEYS.syncDeviceId, "device-on-the-ipad");
        await setMeta(target, META_KEYS.syncCursor, "200");

        await restoreArchive(target, document);

        await expect(getMeta(target, META_KEYS.currency)).resolves.toBe("EUR");
        // A copied device id breaks the same-millisecond tie-break; a jumped cursor skips sequences for good.
        await expect(getMeta(target, META_KEYS.syncDeviceId)).resolves.toBe("device-on-the-ipad");
        await expect(getMeta(target, META_KEYS.syncCursor)).resolves.toBe("200");
    });

    it("does not carry the device keys into the file at all", async () => {
        const db = migratedDatabase();
        await setMeta(db, META_KEYS.syncDeviceId, "device-from-the-iphone");

        const document = await buildArchive(db, new Date());

        expect(JSON.stringify(document.tables.appMeta)).not.toContain("device-from-the-iphone");
    });
});

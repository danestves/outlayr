import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { accounts, categories, outbox, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import {
    enqueueAllForSync,
    getOrCreateDeviceId,
    getSyncCursor,
    isSyncEnabled,
    outboxPendingCount,
    setSyncCursor,
    setSyncEnabled,
} from "./sync-outbox-core";
import { SYNCED_META_KEYS } from "./sync-tables";

async function addTransaction(db: Database, id: string): Promise<void> {
    await db.insert(transactions).values({
        amount: 1,
        date: new Date(1),
        day: new Date(1),
        id,
        income: false,
        month: new Date(1),
        updatedAt: new Date(1),
    });
}

describe("sync device identity", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("mints a device id once and keeps it", async () => {
        const first = await Effect.runPromise(getOrCreateDeviceId(db));

        expect(first).toMatch(/^[0-9a-f-]{36}$/);
        await expect(Effect.runPromise(getOrCreateDeviceId(db))).resolves.toBe(first);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.syncDeviceId))).resolves.toBe(first);
    });

    it("never queues the device id for replication", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));
        await Effect.runPromise(getOrCreateDeviceId(db));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });
});

describe("sync cursor", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("falls back to zero rather than replaying from a corrupt cursor", async () => {
        await Effect.runPromise(setMeta(db, META_KEYS.syncCursor, "not-a-number"));

        await expect(Effect.runPromise(getSyncCursor(db))).resolves.toBe(0);
    });

    it("never queues the cursor for replication", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));
        await Effect.runPromise(setSyncCursor(db, 7));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });
});

describe("the sync gate", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("is off until something turns it on", async () => {
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);

        await addTransaction(db, "t1");

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });

    it("queues writes once it is on", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);

        await addTransaction(db, "t1");

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(1);
    });

    it("empties the queue when it is turned back off", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));
        await addTransaction(db, "t1");

        await Effect.runPromise(setSyncEnabled(db, false));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);

        await addTransaction(db, "t2");

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });
});

describe("enqueueAllForSync", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("queues rows written before the gate opened, tombstones included", async () => {
        await addTransaction(db, "t1");
        await db.insert(transactions).values({
            amount: 0,
            date: new Date(1),
            day: new Date(1),
            deletedAt: new Date(2),
            id: "gone",
            income: false,
            month: new Date(1),
            updatedAt: new Date(1),
        });
        await db.insert(categories).values({ id: "c1", updatedAt: new Date(1) });
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: new Date(1),
            id: "a1",
            initialBalanceDate: new Date(1),
            name: "Checking",
            updatedAt: new Date(1),
        });

        await Effect.runPromise(setSyncEnabled(db, true));
        await Effect.runPromise(enqueueAllForSync(db));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(4);
    });

    it("re-queues an already pending row under a new seq", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));
        await addTransaction(db, "t1");
        const before = await db.select().from(outbox);

        await Effect.runPromise(enqueueAllForSync(db));

        const after = await db.select().from(outbox);
        const queued = after.filter((row) => row.tableName === "transactions" && row.localId === "t1");
        expect(queued).toHaveLength(1);
        expect(queued[0].seq).toBeGreaterThan(before.find((row) => row.localId === "t1")?.seq ?? 0);
    });

    it("queues only account-scoped meta keys", async () => {
        // Both registries: the synced presentation settings use bare names that META_KEYS does not hold.
        for (const key of [...Object.values(META_KEYS), ...SYNCED_META_KEYS]) {
            await Effect.runPromise(setMeta(db, key, "x"));
        }

        await Effect.runPromise(enqueueAllForSync(db));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(SYNCED_META_KEYS.length);
    });

    it("queues a ledger larger than one insert can bind", async () => {
        for (let i = 0; i < 420; i += 1) {
            await addTransaction(db, `t${i}`);
        }

        await Effect.runPromise(enqueueAllForSync(db));

        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(420);
    });
});

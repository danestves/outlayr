import { beforeEach, describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { accounts, budgets, categories, mainBudget, outbox, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { seedCategories } from "./categories-core";
import {
    adoptedAccount,
    completeAdoption,
    localLedgerState,
    markAdopted,
    prepareAccountAdoption,
    runAdoption,
} from "./ledger-adoption";
import type { AdoptionEngine } from "./ledger-adoption";
import {
    getSyncCursor,
    isSyncEnabled,
    outboxPendingCount,
    setSyncCursor,
    setSyncEnabled,
    setSyncedAt,
} from "./sync-outbox-core";

async function addTransaction(target: Database, id: string, deletedAt: Date | null = null): Promise<void> {
    const now = new Date();
    await target.insert(transactions).values({
        amount: 12,
        date: now,
        day: now,
        deletedAt,
        id,
        income: false,
        month: now,
        updatedAt: now,
    });
}

async function queuedIds(target: Database, table: string): Promise<string[]> {
    const rows = await target.select({ localId: outbox.localId }).from(outbox).where(eq(outbox.tableName, table));
    return rows.map((row) => row.localId).sort();
}

let db: Database;

beforeEach(async () => {
    db = migratedDatabase();
    await seedCategories(db);
});

describe("local ledger state", () => {
    it("reads a freshly seeded install as empty", async () => {
        await expect(localLedgerState(db)).resolves.toBe("empty");
    });

    it("errs toward populated on an install that was never seeded", async () => {
        const bare = migratedDatabase();
        await expect(localLedgerState(bare)).resolves.toBe("populated");
    });

    it("reads a transaction deleted offline as populated", async () => {
        await addTransaction(db, "t1", new Date());
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads a budget as populated", async () => {
        const [first] = await db.select().from(categories).limit(1);
        await db.insert(budgets).values({
            amount: 100,
            categoryId: first?.id ?? null,
            id: "b1",
            type: 0,
            updatedAt: new Date(),
        });
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads a main budget as populated", async () => {
        await db.insert(mainBudget).values({ amount: 100, id: "m1", type: 0, updatedAt: new Date() });
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads an account as populated", async () => {
        const now = new Date();
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: now,
            id: "a1",
            initialBalanceDate: now,
            name: "Checking",
            updatedAt: now,
        });
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads a renamed category as populated", async () => {
        const [first] = await db.select().from(categories).limit(1);
        await db
            .update(categories)
            .set({ name: "Renamed", updatedAt: new Date(Date.now() + 1000) })
            .where(eq(categories.id, first?.id ?? ""));
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads a deleted category as populated", async () => {
        const [first] = await db.select().from(categories).limit(1);
        await db
            .update(categories)
            .set({ deletedAt: new Date() })
            .where(eq(categories.id, first?.id ?? ""));
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });

    it("reads an added category as populated", async () => {
        const now = new Date();
        await db.insert(categories).values({
            dateCreated: now,
            id: "c-new",
            name: "Mine",
            updatedAt: now,
        });
        await expect(localLedgerState(db)).resolves.toBe("populated");
    });
});

describe("adoption marker", () => {
    it("account-switch-clears-metadata-before-enable", async () => {
        await markAdopted(db, "account-a");
        await runAdoption(db, null, { pushLocal: false, wipeAccount: false, wipeLocal: false });
        await Effect.runPromise(setSyncCursor(db, 23));
        await Effect.runPromise(setSyncedAt(db, new Date(1_700_000_000_000)));
        await addTransaction(db, "queued-for-account-a");

        await prepareAccountAdoption(db, "account-b");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(Effect.runPromise(getSyncCursor(db))).resolves.toBe(0);
        await expect(getMeta(db, META_KEYS.syncedAt)).resolves.toBeNull();
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
        await expect(adoptedAccount(db)).resolves.toBe("account-a");
    });

    it("account-switch-forgets-photo-keys-so-held-photos-upload-again", async () => {
        await markAdopted(db, "account-a");
        await addTransaction(db, "held");
        await addTransaction(db, "never-downloaded");
        await db
            .update(transactions)
            .set({ imageKey: "photos/account-a/held.jpg", imageUri: "file:///photos/held.jpg" })
            .where(eq(transactions.id, "held"));
        await db
            .update(transactions)
            .set({ imageKey: "photos/account-a/remote.jpg" })
            .where(eq(transactions.id, "never-downloaded"));

        await prepareAccountAdoption(db, "account-b");

        const rows = await db.select({ id: transactions.id, imageKey: transactions.imageKey }).from(transactions);
        expect(Object.fromEntries(rows.map((row) => [row.id, row.imageKey]))).toStrictEqual({
            held: null,
            "never-downloaded": "photos/account-a/remote.jpg",
        });
    });

    it("unmarked-residual-sync-state-is-cleared-before-new-account-adoption", async () => {
        await Effect.runPromise(setSyncEnabled(db, true));
        await Effect.runPromise(setSyncCursor(db, 23));
        await Effect.runPromise(setSyncedAt(db, new Date(1_700_000_000_000)));
        await addTransaction(db, "queued-without-marker");

        await prepareAccountAdoption(db, "account-b");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(Effect.runPromise(getSyncCursor(db))).resolves.toBe(0);
        await expect(getMeta(db, META_KEYS.syncedAt)).resolves.toBeNull();
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });

    it("unmarked-bound-subject-preserves-explicit-sync-off", async () => {
        await setMeta(db, META_KEYS.syncAccountSubject, "account-a");

        await prepareAccountAdoption(db, "account-a");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBe("account-a");
    });

    it("mismatched-marker-and-metadata-cannot-preserve-queued-writes", async () => {
        await markAdopted(db, "account-a");
        await setMeta(db, META_KEYS.syncAccountSubject, "account-b");
        await Effect.runPromise(setSyncEnabled(db, true));
        await addTransaction(db, "queued-for-mismatched-subject");

        await prepareAccountAdoption(db, "account-b");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBeNull();
    });
});

function recordingEngine(): AdoptionEngine & { calls: string[] } {
    const calls: string[] = [];
    return {
        accountLedger: async () => {
            calls.push("accountLedger");
            return "populated";
        },
        calls,
        discardAccountLedger: async () => {
            calls.push("discardAccountLedger");
        },
        replaceFromAccount: async () => {
            calls.push("replaceFromAccount");
        },
    };
}

describe("running an adoption", () => {
    it("opens the sync gate without queueing when there is nothing to push", async () => {
        await runAdoption(db, null, { pushLocal: false, wipeAccount: false, wipeLocal: false }, "account-a");
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBe("account-a");
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });

    it("queues every local row when adopting", async () => {
        await addTransaction(db, "t1");
        await runAdoption(db, null, {
            pushLocal: true,
            wipeAccount: false,
            wipeLocal: false,
        });
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);
        await expect(queuedIds(db, "transactions")).resolves.toStrictEqual(["t1"]);
    });

    it("rolls back tentative account sync when enqueue fails", async () => {
        await Effect.runPromise(setSyncCursor(db, 23));
        await Effect.runPromise(setSyncedAt(db, new Date(1_700_000_000_000)));
        await addTransaction(db, "t1");
        (db.$client as unknown as { exec: (sql: string) => void }).exec(`
			CREATE TRIGGER fail_outbox_enqueue BEFORE INSERT ON outbox
			BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;
		`);

        await expect(
            runAdoption(
                db,
                null,
                {
                    pushLocal: true,
                    wipeAccount: false,
                    wipeLocal: false,
                },
                "account-a"
            )
        ).rejects.toThrow("queue unavailable");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBeNull();
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
        await expect(Effect.runPromise(getSyncCursor(db))).resolves.toBe(0);
        await expect(getMeta(db, META_KEYS.syncedAt)).resolves.toBeNull();
        await expect(adoptedAccount(db)).resolves.toBeNull();
    });

    it("preserves an already-enabled same-subject sync state when enqueue fails", async () => {
        await runAdoption(db, null, { pushLocal: false, wipeAccount: false, wipeLocal: false }, "account-a");
        (db.$client as unknown as { exec: (sql: string) => void }).exec(`
			CREATE TRIGGER fail_outbox_enqueue BEFORE INSERT ON outbox
			BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;
		`);

        await expect(
            runAdoption(
                db,
                null,
                {
                    pushLocal: true,
                    wipeAccount: false,
                    wipeLocal: false,
                },
                "account-a"
            )
        ).rejects.toThrow("queue unavailable");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBe("account-a");
    });

    it("rolls back tentative account sync when marker persistence fails", async () => {
        await expect(
            completeAdoption(
                db,
                null,
                { pushLocal: false, wipeAccount: false, wipeLocal: false },
                "account-a",
                async () => {
                    throw new Error("marker unavailable");
                }
            )
        ).rejects.toThrow("marker unavailable");

        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(getMeta(db, META_KEYS.syncAccountSubject)).resolves.toBeNull();
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
        await expect(Effect.runPromise(getSyncCursor(db))).resolves.toBe(0);
        await expect(getMeta(db, META_KEYS.syncedAt)).resolves.toBeNull();
        await expect(adoptedAccount(db)).resolves.toBeNull();
    });

    it("refuses a destructive plan with no engine to run it through", async () => {
        await expect(
            runAdoption(db, null, {
                pushLocal: false,
                wipeAccount: false,
                wipeLocal: true,
            })
        ).rejects.toThrow();
        await expect(
            runAdoption(db, null, {
                pushLocal: true,
                wipeAccount: true,
                wipeLocal: false,
            })
        ).rejects.toThrow();
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });

    it("refills from the account before the gate opens, so the wipe queues nothing", async () => {
        await addTransaction(db, "t1");
        const engine = recordingEngine();
        engine.replaceFromAccount = async () => {
            engine.calls.push("replaceFromAccount");
            await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        };
        await runAdoption(db, engine, {
            pushLocal: false,
            wipeAccount: false,
            wipeLocal: true,
        });
        expect(engine.calls).toStrictEqual(["replaceFromAccount"]);
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });

    it("discards the account's ledger before queueing this device's", async () => {
        await addTransaction(db, "t1");
        const engine = recordingEngine();
        await runAdoption(db, engine, {
            pushLocal: true,
            wipeAccount: true,
            wipeLocal: false,
        });
        expect(engine.calls).toStrictEqual(["discardAccountLedger"]);
        await expect(queuedIds(db, "transactions")).resolves.toStrictEqual(["t1"]);
    });

    it("leaves both sides untouched when the engine refuses", async () => {
        await addTransaction(db, "t1");
        const engine = recordingEngine();
        engine.discardAccountLedger = async () => {
            throw new Error("offline");
        };
        await expect(
            runAdoption(db, engine, {
                pushLocal: true,
                wipeAccount: true,
                wipeLocal: false,
            })
        ).rejects.toThrow();
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
        await expect(Effect.runPromise(outboxPendingCount(db))).resolves.toBe(0);
    });
});

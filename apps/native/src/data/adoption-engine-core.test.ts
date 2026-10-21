import { beforeEach, describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedSqlite, testDatabase } from "@/db/test-database";

import { incomingWins } from "../../../../packages/backend/convex/lib/syncTables";
import { accountLedgerState, discardAccountLedger, replaceLocalFromAccount } from "./adoption-engine-core";
import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { candidateLogoIds, rememberLogoCandidate } from "./logo-backfill-state";
import { drainOutbox, runSync } from "./sync-engine-core";
import type { PulledRow, PushFn } from "./sync-engine-core";
import { enqueueAllForSync, setSyncEnabled } from "./sync-outbox-core";

function makeDb(): Database {
    const sqlite = migratedSqlite();
    sqlite.exec("PRAGMA foreign_keys = ON");
    return testDatabase(sqlite);
}

/** One row per `(table, localId)`, merged by the server's own `incomingWins`. */
function makeServer() {
    const rows = new Map<string, PulledRow>();
    let nextSeq = 1;

    const push: PushFn = async ({ deviceId, rows: pushed }) => {
        let accepted = 0;
        let skipped = 0;
        for (const row of pushed) {
            const key = `${row.table} ${row.localId}`;
            const existing = rows.get(key);
            if (!incomingWins({ ...row, deviceId }, existing ?? null)) {
                skipped += 1;
                continue;
            }
            rows.set(key, { ...row, deviceId, restoredAt: row.restoredAt ?? null, seq: nextSeq });
            nextSeq += 1;
            accepted += 1;
        }
        return { accepted, nextSeq, skipped };
    };

    const pull = async ({ cursor, limit }: { cursor: number; limit: number }) => {
        const after = [...rows.values()].filter((row) => row.seq > cursor).sort((a, b) => a.seq - b.seq);
        const page = after.slice(0, limit);
        return {
            cursor: page.at(-1)?.seq ?? cursor,
            hasMore: after.length > page.length,
            rows: page,
        };
    };

    return { pull, push, rows, transport: { pull, push } };
}

async function addTransaction(db: Database, id: string, updatedAt: Date): Promise<void> {
    await db.insert(transactions).values({
        amount: 10,
        date: updatedAt,
        day: updatedAt,
        id,
        income: false,
        month: updatedAt,
        note: id,
        updatedAt,
    });
}

function serverRow(
    localId: string,
    updatedAt: number,
    deletedAt: number | null = null,
    restoredAt: number | null = null
): PulledRow {
    return {
        deletedAt,
        restoredAt,
        deviceId: "peer",
        fields: {
            amount: 99,
            amountUsd: null,
            categoryId: null,
            currency: null,
            customColor: null,
            date: updatedAt,
            day: updatedAt,
            details: null,
            emoji: null,
            exchangeRate: null,
            exchangeRateType: null,
            icon: null,
            imageColor: null,
            imageUri: null,
            income: false,
            month: updatedAt,
            note: `remote ${localId}`,
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
        },
        localId,
        seq: 0,
        table: "transactions",
        updatedAt,
    };
}

describe("accountLedgerState", () => {
    it("reads an account holding only tombstones as empty", async () => {
        const server = makeServer();
        await server.push({
            deviceId: "peer",
            rows: [{ ...serverRow("a", 100, 100) }],
        });
        await expect(accountLedgerState(server.pull)).resolves.toBe("empty");
    });

    it("reads one live row as populated", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("a", 100)] });
        await expect(accountLedgerState(server.pull)).resolves.toBe("populated");
    });
});

describe("replaceLocalFromAccount", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("discards local rows and takes the account's", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("remote", 100)] });
        await addTransaction(db, "local", new Date(50));

        await replaceLocalFromAccount(db, server.pull);

        const rows = await db.select().from(transactions);
        expect(rows.map((row) => row.id)).toStrictEqual(["remote"]);
    });

    it("spends the one-time restore re-read, having just read the whole log", async () => {
        const server = makeServer();
        await setMeta(db, META_KEYS.syncRestoresReread, "1");

        await replaceLocalFromAccount(db, server.pull);

        await expect(getMeta(db, META_KEYS.syncRestoresReread)).resolves.toBeNull();
    });

    it("keeps device-local meta that no pull would hand back", async () => {
        const server = makeServer();
        await setMeta(db, META_KEYS.syncDeviceId, "this-device");
        await setMeta(db, META_KEYS.onboardingComplete, "1");
        await setMeta(db, META_KEYS.currency, "GBP");

        await replaceLocalFromAccount(db, server.pull);

        await expect(getMeta(db, META_KEYS.syncDeviceId)).resolves.toBe("this-device");
        await expect(getMeta(db, META_KEYS.onboardingComplete)).resolves.toBe("1");
        await expect(getMeta(db, META_KEYS.currency)).resolves.toBeNull();
    });
});

describe("discardAccountLedger", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("leaves a row both sides hold alive, and lets the local one win", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("shared", 900)] });
        await addTransaction(db, "shared", new Date(100));

        await discardAccountLedger(db, server.transport);

        expect(server.rows.get("transactions shared")?.deletedAt).toBeNull();

        await setSyncEnabled(db, true);
        await enqueueAllForSync(db);
        await drainOutbox(db, server.push);

        const survivor = server.rows.get("transactions shared");
        expect(survivor?.deletedAt).toBeNull();
        expect(survivor?.fields.note).toBe("shared");
    });

    it("keeps the local row over one the account restored, even when the local edit is newer", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("restored", 900, null, 900)] });
        await addTransaction(db, "restored", new Date(1000));

        await discardAccountLedger(db, server.transport);
        await setSyncEnabled(db, true);
        await enqueueAllForSync(db);
        await drainOutbox(db, server.push);

        expect(server.rows.get("transactions restored")?.fields.note).toBe("restored");
    });

    it("moves a lifted row's logo candidate with its new clock", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("shared", 900)] });
        await addTransaction(db, "shared", new Date(100));
        await rememberLogoCandidate(db, "shared", 100, Number.POSITIVE_INFINITY);

        await discardAccountLedger(db, server.transport);

        const [row] = await db
            .select({ updatedAt: transactions.updatedAt })
            .from(transactions)
            .where(eq(transactions.id, "shared"));
        expect((await candidateLogoIds(db)).get("shared")).toBe(row.updatedAt.getTime());
    });

    it("tombstones only rows this device has never seen", async () => {
        const server = makeServer();
        await server.push({
            deviceId: "peer",
            rows: [serverRow("theirs", 900), serverRow("shared", 900)],
        });
        await addTransaction(db, "shared", new Date(100));

        await discardAccountLedger(db, server.transport);

        expect(server.rows.get("transactions theirs")?.deletedAt).not.toBeNull();
        expect(server.rows.get("transactions shared")?.deletedAt).toBeNull();
    });

    it("is safe to run twice", async () => {
        const server = makeServer();
        await server.push({ deviceId: "peer", rows: [serverRow("theirs", 900)] });

        await discardAccountLedger(db, server.transport);
        const afterFirst = server.rows.get("transactions theirs")?.deletedAt;
        await discardAccountLedger(db, server.transport);

        expect(afterFirst).not.toBeNull();
        expect(server.rows.size).toBe(1);
    });
});

describe("a tombstoned account row does not come back to bite", () => {
    it("keeps the local ledger after a full keep-local round trip", async () => {
        const db = makeDb();
        const server = makeServer();
        await server.push({
            deviceId: "peer",
            rows: [serverRow("theirs", 900), serverRow("shared", 900)],
        });
        await addTransaction(db, "shared", new Date(100));
        await addTransaction(db, "mine", new Date(100));

        await discardAccountLedger(db, server.transport);
        await setSyncEnabled(db, true);
        await enqueueAllForSync(db);
        await runSync(db, server.transport);

        const live = (await db.select().from(transactions))
            .filter((row) => row.deletedAt === null)
            .map((row) => row.id)
            .sort();
        expect(live).toStrictEqual(["mine", "shared"]);
        const theirs = await db.select().from(transactions).where(eq(transactions.id, "theirs"));
        expect(theirs).toHaveLength(1);
        expect(theirs[0]?.deletedAt).not.toBeNull();
    });
});

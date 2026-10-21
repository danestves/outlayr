import { beforeEach, describe, expect, it } from "@jest/globals";
import { eq, getTableColumns, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
    accounts,
    budgets,
    categories,
    installmentPlans,
    mainBudget,
    outbox,
    savingsGoals,
    tags,
    transactions,
    transactionTags,
} from "@/db/schema";
import { migratedDatabase, transactionalDatabase } from "@/db/test-database";

import { incomingWins } from "../../../../packages/backend/convex/lib/syncTables";
import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { applyPulledRows, drainOutbox, incomingWinsLocally, pullAndApply, runSync, specFor } from "./sync-engine-core";
import type { PullFn, PulledRow, PushFn, WireRow } from "./sync-engine-core";
import { getSyncCursor, outboxPendingCount, SYNCED_TABLES, setSyncCursor, setSyncEnabled } from "./sync-outbox-core";
import { transactionsRepo } from "./transactions-core";

const makeDb = (): Database => migratedDatabase();

/** A minimal server using the real `incomingWins`; the Convex handler is tested in `convex/sync.test.ts`. */
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

    const pull: PullFn = async ({ cursor, limit, tables }) => {
        const after = [...rows.values()]
            .filter((row) => row.seq > cursor && (tables === undefined || tables.includes(row.table)))
            .sort((a, b) => a.seq - b.seq);
        const page = after.slice(0, limit);
        return {
            cursor: page.at(-1)?.seq ?? cursor,
            hasMore: after.length > page.length,
            rows: page,
        };
    };

    return { pull, push, rows, transport: { pull, push } };
}

const AT = (ms: number) => new Date(ms);

const eqId = (id: string) => eq(transactions.id, id);

async function addTransaction(
    db: Database,
    id: string,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): Promise<void> {
    await db.insert(transactions).values({
        amount: 10,
        date: AT(1000),
        day: AT(1000),
        id,
        income: false,
        month: AT(1000),
        note: id,
        updatedAt: AT(1000),
        ...overrides,
    });
}

function txRow(
    localId: string,
    seq: number,
    updatedAt: number,
    overrides: {
        deletedAt?: number | null;
        deviceId?: string;
        fields?: Record<string, unknown>;
        restoredAt?: number | null;
    } = {}
): PulledRow {
    return {
        deletedAt: overrides.deletedAt ?? null,
        restoredAt: overrides.restoredAt ?? null,
        deviceId: overrides.deviceId ?? "device-b",
        fields: {
            amount: 10,
            amountUsd: null,
            categoryId: null,
            currency: null,
            customColor: null,
            date: 1000,
            day: 1000,
            details: null,
            emoji: null,
            exchangeRate: null,
            exchangeRateType: null,
            icon: null,
            imageColor: null,
            imageUri: null,
            income: false,
            month: 1000,
            note: localId,
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: 0,
            ...overrides.fields,
        },
        localId,
        seq,
        table: "transactions",
        updatedAt,
    };
}

function metaRow(key: string, seq: number, updatedAt: number, value: string | null): PulledRow {
    return {
        deletedAt: null,
        deviceId: "device-b",
        fields: { value },
        localId: key,
        seq,
        table: "appMeta",
        updatedAt,
    };
}

describe("the replicated column set", () => {
    const ENVELOPE = new Set(["id", "key", "updatedAt", "deletedAt", "restoredAt"]);
    const DEVICE_LOCAL = new Set([
        "transactions.imageUri",
        "transactions.reminderLeadDays",
        "transactionPhotos.imageUri",
        "accounts.imageUri",
    ]);

    for (const table of SYNCED_TABLES) {
        it(`covers every column of ${table}`, () => {
            const spec = specFor(table);
            const declared = Object.keys(getTableColumns(spec.table)).filter(
                (name) => !(ENVELOPE.has(name) || DEVICE_LOCAL.has(`${table}.${name}`))
            );

            expect([...spec.fields].sort()).toStrictEqual(declared.sort());
        });
    }

    it("names only real timestamp columns as dates", () => {
        for (const table of SYNCED_TABLES) {
            const spec = specFor(table);
            for (const name of spec.dates) {
                expect(spec.fields.includes(name)).toBeTruthy();
            }
        }
    });
});

describe("incomingWinsLocally", () => {
    it("takes anything when there is no local row", () => {
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 1 }, null, false)).toBe(true);
    });

    it("r1 — a tombstone is absorbing in both directions", () => {
        expect(incomingWinsLocally({ deletedAt: 1, updatedAt: 1 }, { deletedAt: null, updatedAt: 999 }, false)).toBe(
            true
        );
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 999 }, { deletedAt: 1, updatedAt: 1 }, false)).toBe(
            false
        );
    });

    it("r2 — the greater updatedAt takes the row", () => {
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 2 }, { deletedAt: null, updatedAt: 1 }, false)).toBe(
            true
        );
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 1 }, { deletedAt: null, updatedAt: 2 }, false)).toBe(
            false
        );
    });

    it("keeps an unsent local edit on an exact tie", () => {
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 5 }, { deletedAt: null, updatedAt: 5 }, true)).toBe(
            false
        );
        expect(incomingWinsLocally({ deletedAt: null, updatedAt: 5 }, { deletedAt: null, updatedAt: 5 }, false)).toBe(
            true
        );
    });
});

// Mirrors the server's cases in `packages/backend/convex/lib/syncTables.test.ts`; the two must agree.
describe("incomingWinsLocally across a restore", () => {
    const live = (updatedAt: number, restoredAt: number | null = null) => ({ deletedAt: null, restoredAt, updatedAt });
    const deleted = (deletedAt: number, restoredAt: number | null = null) => ({
        deletedAt,
        restoredAt,
        updatedAt: deletedAt,
    });

    it.each([
        ["a restore beats the older tombstone it lifted", live(20, 20), deleted(10), true],
        ["the lifted tombstone does not undo the restore", deleted(10), live(20, 20), false],
        ["an offline edit after a delete still loses", live(12), deleted(10), false],
        ["an edit that raced the delete loses to the restore", live(30), live(20, 20), false],
        ["a delete after the restore wins", deleted(25, 20), live(20, 20), true],
        ["a delete after the restore wins with its clock behind", deleted(15, 20), live(20, 20), true],
        ["a delete that never saw the restore wins only if later", deleted(22), live(20, 20), true],
        ["a delete that never saw the restore loses if earlier", deleted(18), live(20, 20), false],
        ["a restore stamped at the delete's instant loses the tie", live(10, 10), deleted(10), false],
        ["an edit after the restore is plain R2", live(30, 20), live(20, 20), true],
    ])("%s", (_name, incoming, local, wins) => {
        expect(incomingWinsLocally(incoming, local, false)).toBe(wins);
    });
});

describe("drainOutbox", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("pushes nothing while the gate is shut", async () => {
        await addTransaction(db, "t1");
        let calls = 0;
        const push: PushFn = async () => {
            calls += 1;
            return { accepted: 0, nextSeq: 1, skipped: 0 };
        };

        await expect(drainOutbox(db, push)).resolves.toBe(0);
        expect(calls).toBe(0);
    });

    it("pushes queued rows and clears exactly what it sent", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1");
        await addTransaction(db, "t2");
        const server = makeServer();

        await expect(drainOutbox(db, server.push)).resolves.toBe(2);
        await expect(outboxPendingCount(db)).resolves.toBe(0);
        expect(server.rows.size).toBe(2);
    });

    it("carries the row's own values, dates as epoch milliseconds", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1", {
            amount: 42.5,
            date: AT(5000),
            note: "lunch",
            updatedAt: AT(7000),
        });
        let seen: WireRow[] = [];
        await drainOutbox(db, async ({ rows }) => {
            seen = rows;
            return { accepted: rows.length, nextSeq: 1, skipped: 0 };
        });

        expect(seen[0].table).toBe("transactions");
        expect(seen[0].updatedAt).toBe(7000);
        expect(seen[0].deletedAt).toBeNull();
        expect(seen[0].fields.amount).toBe(42.5);
        expect(seen[0].fields.note).toBe("lunch");
        expect(seen[0].fields.date).toBe(5000);
        expect(seen[0].fields.categoryId).toBeNull();
    });

    it("round-trips resolved and pending custom transaction rate triples", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "resolved-custom", {
            amountUsd: 1.801802,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        await addTransaction(db, "pending-custom", {
            amountUsd: null,
            exchangeRate: null,
            exchangeRateType: "custom",
        });
        let wireRows: WireRow[] = [];
        await drainOutbox(db, async ({ rows }) => {
            wireRows = rows;
            return { accepted: rows.length, nextSeq: rows.length, skipped: 0 };
        });

        const target = makeDb();
        await applyPulledRows(target, {
            cursor: wireRows.length,
            rows: wireRows.map((row, index) => ({ ...row, deviceId: "device-a", seq: index + 1 })),
        });
        const replicated = await target.select().from(transactions);
        expect(replicated.find((row) => row.id === "resolved-custom")).toMatchObject({
            amountUsd: 1.801802,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        expect(replicated.find((row) => row.id === "pending-custom")).toMatchObject({
            amountUsd: null,
            exchangeRate: null,
            exchangeRateType: "custom",
        });
    });

    it("pushes a tombstone as one", async () => {
        await addTransaction(db, "t1");
        await setSyncEnabled(db, true);
        await db
            .update(transactions)
            .set({ deletedAt: AT(9000), updatedAt: AT(9000) })
            .where(eqId("t1"));
        let seen: WireRow[] = [];
        await drainOutbox(db, async ({ rows }) => {
            seen = rows;
            return { accepted: rows.length, nextSeq: 1, skipped: 0 };
        });

        expect(seen[0].deletedAt).toBe(9000);
    });

    it("leaves an edit that arrived mid-flight queued", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1");
        const push: PushFn = async ({ rows }) => {
            await db
                .update(transactions)
                .set({ note: "edited", updatedAt: AT(2000) })
                .where(eqId("t1"));
            return { accepted: rows.length, nextSeq: 1, skipped: 0 };
        };

        await drainOutbox(db, push);

        await expect(outboxPendingCount(db)).resolves.toBe(1);
    });

    it("pages a queue longer than one batch", async () => {
        await setSyncEnabled(db, true);
        for (let i = 0; i < 501; i += 1) {
            await addTransaction(db, `t${i}`);
        }
        const batches: number[] = [];
        await drainOutbox(db, async ({ rows }) => {
            batches.push(rows.length);
            return { accepted: rows.length, nextSeq: 1, skipped: 0 };
        });

        expect(batches).toStrictEqual([500, 1]);
        await expect(outboxPendingCount(db)).resolves.toBe(0);
    });

    it("keeps the queue when the push throws", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1");

        await expect(
            drainOutbox(db, async () => {
                throw new Error("offline");
            })
        ).rejects.toThrow();
        await expect(outboxPendingCount(db)).resolves.toBe(1);
    });

    it("pushes only the account-scoped meta keys", async () => {
        await setSyncEnabled(db, true);
        await setMeta(db, META_KEYS.currency, "EUR");
        await setMeta(db, META_KEYS.firstLaunch, "0");
        let seen: WireRow[] = [];
        await drainOutbox(db, async ({ rows }) => {
            seen = rows;
            return { accepted: rows.length, nextSeq: 1, skipped: 0 };
        });

        expect(seen.map((row) => row.localId)).toStrictEqual([META_KEYS.currency]);
        expect(seen[0].fields.value).toBe("EUR");
        expect(seen[0].deletedAt).toBeNull();
    });
});

describe("applyPulledRows", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("inserts a row this device has never seen", async () => {
        const result = await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("remote", 1, 5000, { fields: { amount: 7.5 } })],
        });

        const [row] = await db.select().from(transactions);
        expect(result.applied).toBe(1);
        expect(row.id).toBe("remote");
        expect(row.amount).toBe(7.5);
        expect(row.updatedAt.getTime()).toBe(5000);
        await expect(getSyncCursor(db)).resolves.toBe(1);
    });

    it("commits the whole apply inside one real transaction", async () => {
        const transactional = transactionalDatabase();
        await setMeta(transactional, META_KEYS.syncEnabled, "true");
        await transactional.insert(transactions).values({
            amount: 1,
            date: new Date(1),
            day: new Date(1),
            id: "remote",
            income: false,
            month: new Date(1),
            updatedAt: new Date(1000),
        });

        const result = await applyPulledRows(transactional, {
            cursor: 9,
            rows: [txRow("remote", 1, 5000, { fields: { amount: 7.5 } })],
        });

        const [row] = await transactional.select().from(transactions);
        expect(result.applied).toBe(1);
        expect(row.amount).toBe(7.5);
        await expect(getSyncCursor(transactional)).resolves.toBe(9);
        await expect(outboxPendingCount(transactional)).resolves.toBe(0);
    });

    it("round-trips dates and nulls", async () => {
        await applyPulledRows(db, {
            cursor: 1,
            rows: [
                txRow("remote", 1, 5000, {
                    fields: { date: 111, day: 222, month: 333, recurringEndDate: null },
                }),
            ],
        });

        const [row] = await db.select().from(transactions);
        expect(row.date.getTime()).toBe(111);
        expect(row.day.getTime()).toBe(222);
        expect(row.month.getTime()).toBe(333);
        expect(row.recurringEndDate).toBeNull();
        expect(row.deletedAt).toBeNull();
    });

    it("keeps a newer local row and does not clear its queue entry", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1", { note: "mine", updatedAt: AT(9000) });

        const result = await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("t1", 1, 1000, { fields: { note: "theirs" } })],
        });

        const [row] = await db.select().from(transactions);
        expect(result.applied).toBe(0);
        expect(row.note).toBe("mine");
        await expect(outboxPendingCount(db)).resolves.toBe(1);
    });

    it("r1 — a local tombstone is not resurrected by a newer incoming edit", async () => {
        await addTransaction(db, "t1", {
            deletedAt: AT(1000),
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("t1", 1, 9000, { fields: { note: "back" } })],
        });

        const [row] = await db.select().from(transactions);
        expect(row.deletedAt?.getTime()).toBe(1000);
        expect(row.note).not.toBe("back");
    });

    it("clears the local notice when a peer retires the schedule", async () => {
        await addTransaction(db, "t1", {
            onceRecurring: true,
            recurringType: 3,
            reminderLeadDays: 3,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [
                txRow("t1", 1, 9000, {
                    fields: { onceRecurring: true, recurringType: 0 },
                }),
            ],
        });

        const [row] = await db.select().from(transactions);
        expect(row.reminderLeadDays).toBeNull();
    });

    it("clears the local notice when a peer deletes the row", async () => {
        await addTransaction(db, "t1", {
            onceRecurring: true,
            recurringType: 3,
            reminderLeadDays: 3,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("t1", 1, 9000, { deletedAt: 9000 })],
        });

        const [row] = await db.select().from(transactions);
        expect(row.reminderLeadDays).toBeNull();
    });

    it("keeps the local notice when a peer edits the live carrier", async () => {
        await addTransaction(db, "t1", {
            onceRecurring: true,
            recurringType: 3,
            reminderLeadDays: 3,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [
                txRow("t1", 1, 9000, {
                    fields: { note: "theirs", onceRecurring: true, recurringType: 3 },
                }),
            ],
        });

        const [row] = await db.select().from(transactions);
        expect(row.note).toBe("theirs");
        expect(row.reminderLeadDays).toBe(3);
    });

    it("keeps an unsent local edit on an exact updatedAt tie", async () => {
        await setSyncEnabled(db, true);
        await addTransaction(db, "t1", { note: "mine", updatedAt: AT(5000) });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("t1", 1, 5000, { fields: { note: "theirs" } })],
        });

        const [row] = await db.select().from(transactions);
        expect(row.note).toBe("mine");
        await expect(outboxPendingCount(db)).resolves.toBe(1);
    });

    it("deletes the queue entries its own writes create", async () => {
        await setSyncEnabled(db, true);

        await applyPulledRows(db, {
            cursor: 1,
            rows: [txRow("remote", 1, 5000)],
        });

        await expect(outboxPendingCount(db)).resolves.toBe(0);
    });

    it("applies a page whose transaction precedes the category it references", async () => {
        const category: PulledRow = {
            deletedAt: null,
            deviceId: "device-b",
            fields: {
                color: "#FFFFFF",
                dateCreated: null,
                emoji: null,
                icon: null,
                income: false,
                name: "Bills",
                parentId: null,
                sortOrder: 0,
            },
            localId: "c1",
            seq: 2,
            table: "categories",
            updatedAt: 6000,
        };

        const result = await applyPulledRows(db, {
            cursor: 2,
            rows: [txRow("t1", 1, 5000, { fields: { categoryId: "c1" } }), category],
        });

        expect(result.applied).toBe(2);
        const [row] = await db.select().from(transactions);
        expect(row.categoryId).toBe("c1");
    });

    it("advances the cursor only as far as the page reached", async () => {
        await applyPulledRows(db, { cursor: 1, rows: [txRow("t1", 1, 5000)] });
        await applyPulledRows(db, { cursor: 7, rows: [txRow("t2", 7, 5000)] });

        await expect(getSyncCursor(db)).resolves.toBe(7);
    });

    it("leaves the cursor alone on an empty page", async () => {
        await applyPulledRows(db, { cursor: 99, rows: [] });

        await expect(getSyncCursor(db)).resolves.toBe(0);
    });

    it("keeps an unsent local meta value rather than taking the incoming one", async () => {
        await setSyncEnabled(db, true);
        await setMeta(db, META_KEYS.currency, "GBP");

        await applyPulledRows(db, {
            cursor: 1,
            rows: [metaRow(META_KEYS.currency, 1, 9000, "JPY")],
        });

        await expect(getMeta(db, META_KEYS.currency)).resolves.toBe("GBP");
        await expect(outboxPendingCount(db)).resolves.toBe(1);
    });

    it("takes the incoming meta value when nothing local is owed", async () => {
        await setMeta(db, META_KEYS.currency, "GBP");

        await applyPulledRows(db, {
            cursor: 1,
            rows: [metaRow(META_KEYS.currency, 1, 9000, "JPY")],
        });

        await expect(getMeta(db, META_KEYS.currency)).resolves.toBe("JPY");
    });

    it("ignores an incoming meta key the allow-list no longer names", async () => {
        await setMeta(db, "numberEntryType", "1");

        const result = await applyPulledRows(db, {
            cursor: 1,
            rows: [metaRow("numberEntryType", 1, 9000, "2")],
        });

        await expect(getMeta(db, "numberEntryType")).resolves.toBe("1");
        expect(result.tables).toStrictEqual([]);
    });

    it("reports the tables it wrote so the caller can invalidate them", async () => {
        const result = await applyPulledRows(db, {
            cursor: 2,
            rows: [
                txRow("t1", 1, 5000),
                {
                    deletedAt: null,
                    deviceId: "device-b",
                    fields: { value: "JPY" },
                    localId: META_KEYS.currency,
                    seq: 2,
                    table: "appMeta",
                    updatedAt: 5000,
                },
            ],
        });

        expect(result.tables.sort((a, b) => a.localeCompare(b))).toStrictEqual(["appMeta", "transactions"]);
    });
});

describe("the echo of this device's own push", () => {
    let db: Database;
    let server: ReturnType<typeof makeServer>;
    beforeEach(async () => {
        db = makeDb();
        server = makeServer();
        await setSyncEnabled(db, true);
    });

    async function pushAndEcho() {
        await drainOutbox(db, server.push);
        return await server.pull({ cursor: await getSyncCursor(db), limit: 100 });
    }

    const totalChanges = async () => (await db.all<{ n: number }>(sql`SELECT total_changes() AS n`))[0]?.n;

    it("writes nothing but the cursor when every row comes back as it left", async () => {
        await addTransaction(db, "t1", { amountUsd: 0.1 + 0.2, onceRecurring: true, recurringEndDate: AT(4321) });
        await setMeta(db, META_KEYS.currency, "JPY");
        const echo = await pushAndEcho();
        const before = await totalChanges();

        const result = await applyPulledRows(db, echo);

        expect(result.tables).toStrictEqual([]);
        await expect(totalChanges()).resolves.toBe((before ?? 0) + 1);
        await expect(outboxPendingCount(db)).resolves.toBe(0);
    });

    it("still writes a row that differs in a single field", async () => {
        await addTransaction(db, "t1", { note: "mine" });
        const { cursor, rows } = await pushAndEcho();

        const result = await applyPulledRows(db, {
            cursor,
            rows: rows.map((row) => ({ ...row, fields: { ...row.fields, note: "theirs" } })),
        });

        const [row] = await db.select().from(transactions);
        expect(result.tables).toStrictEqual(["transactions"]);
        expect(row.note).toBe("theirs");
    });

    it("keeps a goal's unconvertible start null rather than defaulting it", async () => {
        await db.insert(accounts).values({
            currency: "VES",
            dateCreated: AT(1000),
            id: "acct-1",
            initialBalance: 0,
            initialBalanceDate: AT(1000),
            name: "Savings",
            updatedAt: AT(1000),
        });
        await db.insert(savingsGoals).values({
            accountId: "acct-1",
            currency: "VES",
            dateCreated: AT(1000),
            id: "goal-1",
            name: "Moto",
            startAmount: 500,
            startAmountUsd: null,
            targetAmount: 5000,
            targetAmountUsd: 100,
            targetDate: AT(9000),
            updatedAt: AT(1000),
        });

        const result = await applyPulledRows(db, await pushAndEcho());

        const [goal] = await db.select().from(savingsGoals);
        expect(goal.startAmountUsd).toBeNull();
        expect(result.tables).toStrictEqual([]);
    });

    it("still clears the notice on an echoed row with no live schedule", async () => {
        await addTransaction(db, "t1", { recurringType: 0, reminderLeadDays: 3 });

        const result = await applyPulledRows(db, await pushAndEcho());

        const [row] = await db.select().from(transactions);
        expect(result.tables).toStrictEqual(["transactions"]);
        expect(row.reminderLeadDays).toBeNull();
    });
});

async function seedTagPair(db: Database): Promise<void> {
    await addTransaction(db, "t1");
    await db.insert(tags).values({ id: "g1", name: "coffee", sortOrder: 0, updatedAt: AT(1) });
}

function tagLinkRow(localId: string, updatedAt: number): PulledRow {
    return {
        deletedAt: null,
        deviceId: "device-b",
        fields: { tagId: "g1", transactionId: "t1" },
        localId,
        seq: 1,
        table: "transactionTags",
        updatedAt,
    };
}

function budgetRow(localId: string, seq: number, updatedAt: number, categoryId: string | null): PulledRow {
    return {
        deletedAt: null,
        deviceId: "device-b",
        fields: {
            amount: 100,
            amountUsd: 100,
            categoryId,
            currency: "USD",
            dateCreated: null,
            green: false,
            name: null,
            rollover: false,
            startDate: null,
            type: 0,
        },
        localId,
        seq,
        table: "budgets",
        updatedAt,
    };
}

describe("r3 — invariants Convex cannot hold", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("keeps one live budget per category when the incoming row wins", async () => {
        await db.insert(categories).values({ id: "c1", updatedAt: AT(1) });
        await db.insert(budgets).values({
            amount: 50,
            categoryId: "c1",
            id: "local",
            type: 0,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [budgetRow("remote", 1, 9000, "c1")],
        });

        const rows = await db.select().from(budgets);
        const live = rows.filter((row) => row.deletedAt === null);
        expect(live).toHaveLength(1);
        expect(live[0].id).toBe("remote");
        const loser = rows.find((row) => row.id === "local");
        expect(loser?.deletedAt).not.toBeNull();
        expect(loser?.categoryId).toBeNull();
    });

    it("tombstones the incoming budget when the local one wins", async () => {
        await setSyncEnabled(db, true);
        await db.insert(categories).values({ id: "c1", updatedAt: AT(1) });
        await db.insert(budgets).values({
            amount: 50,
            categoryId: "c1",
            id: "local",
            type: 0,
            updatedAt: AT(9000),
        });
        await db.delete(outbox);

        await applyPulledRows(db, {
            cursor: 1,
            rows: [budgetRow("remote", 1, 1000, "c1")],
        });

        const rows = await db.select().from(budgets);
        const live = rows.filter((row) => row.deletedAt === null);
        expect(live).toHaveLength(1);
        expect(live[0].id).toBe("local");
        expect(rows.find((row) => row.id === "remote")?.categoryId).toBeNull();
        expect((await db.select().from(outbox)).map((row) => row.localId)).toStrictEqual(["remote"]);
    });

    it("queues the tombstone it writes so the other device converges", async () => {
        await setSyncEnabled(db, true);
        await db.insert(categories).values({ id: "c1", updatedAt: AT(1) });
        await db.insert(budgets).values({
            amount: 50,
            categoryId: "c1",
            id: "local",
            type: 0,
            updatedAt: AT(1000),
        });
        await db.delete(outbox);

        await applyPulledRows(db, {
            cursor: 1,
            rows: [budgetRow("remote", 1, 9000, "c1")],
        });

        const queued = await db.select().from(outbox);
        expect(queued.map((row) => row.localId)).toStrictEqual(["local"]);
    });

    it("picks the same survivor on both devices when updatedAt ties", async () => {
        const seed = async (database: Database, mine: string, theirs: string) => {
            await database.insert(categories).values({ id: "c1", updatedAt: AT(1) });
            await database.insert(budgets).values({
                amount: 50,
                categoryId: "c1",
                id: mine,
                type: 0,
                updatedAt: AT(5000),
            });
            await applyPulledRows(database, {
                cursor: 1,
                rows: [budgetRow(theirs, 1, 5000, "c1")],
            });
            const rows = await database.select().from(budgets);
            return rows.filter((row) => row.deletedAt === null).map((row) => row.id);
        };

        const first = makeDb();
        const second = makeDb();

        await expect(seed(first, "aaa", "zzz")).resolves.toStrictEqual(["zzz"]);
        await expect(seed(second, "zzz", "aaa")).resolves.toStrictEqual(["zzz"]);
    });

    it("keeps one live tag link per pair when the incoming row wins", async () => {
        await seedTagPair(db);
        await db.insert(transactionTags).values({ id: "local", tagId: "g1", transactionId: "t1", updatedAt: AT(1000) });

        await applyPulledRows(db, { cursor: 1, rows: [tagLinkRow("remote", 9000)] });

        const rows = await db.select().from(transactionTags);
        const live = rows.filter((row) => row.deletedAt === null);
        expect(live.map((row) => row.id)).toStrictEqual(["remote"]);
        expect(rows.find((row) => row.id === "local")?.deletedAt).not.toBeNull();
    });

    it("tombstones the incoming tag link when the local one wins, and keeps it queued", async () => {
        await setSyncEnabled(db, true);
        await seedTagPair(db);
        await db.insert(transactionTags).values({ id: "local", tagId: "g1", transactionId: "t1", updatedAt: AT(9000) });
        await db.delete(outbox);

        await applyPulledRows(db, { cursor: 1, rows: [tagLinkRow("remote", 1000)] });

        const rows = await db.select().from(transactionTags);
        expect(rows.filter((row) => row.deletedAt === null).map((row) => row.id)).toStrictEqual(["local"]);
        expect(rows.find((row) => row.id === "remote")?.deletedAt).not.toBeNull();
        expect((await db.select().from(outbox)).map((row) => row.localId)).toStrictEqual(["remote"]);
    });

    it("leaves two budgets on different categories alone", async () => {
        await db.insert(categories).values([
            { id: "c1", updatedAt: AT(1) },
            { id: "c2", updatedAt: AT(1) },
        ]);
        await db.insert(budgets).values({
            amount: 50,
            categoryId: "c1",
            id: "local",
            type: 0,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [budgetRow("remote", 1, 9000, "c2")],
        });

        const live = (await db.select().from(budgets)).filter((row) => row.deletedAt === null);
        expect(live).toHaveLength(2);
    });

    it("collapses two live overall budgets to one", async () => {
        await db.insert(mainBudget).values({
            amount: 50,
            id: "local",
            type: 0,
            updatedAt: AT(1000),
        });

        await applyPulledRows(db, {
            cursor: 1,
            rows: [
                {
                    deletedAt: null,
                    deviceId: "device-b",
                    fields: {
                        amount: 100,
                        amountUsd: 100,
                        currency: "USD",
                        dateCreated: null,
                        green: false,
                        name: null,
                        rollover: false,
                        startDate: null,
                        type: 0,
                    },
                    localId: "remote",
                    seq: 1,
                    table: "mainBudget",
                    updatedAt: 9000,
                },
            ],
        });

        const live = (await db.select().from(mainBudget)).filter((row) => row.deletedAt === null);
        expect(live).toHaveLength(1);
        expect(live[0].id).toBe("remote");
    });
});

describe("two devices against one account", () => {
    it("applies a re-emitted pending-custom winner after its original sequence was consumed", async () => {
        const db = makeDb();
        await setSyncEnabled(db, true);
        await applyPulledRows(db, { cursor: 1, rows: [metaRow("currency", 1, 50, "VES")] });
        await addTransaction(db, "t1", {
            amountUsd: 2.5,
            currency: "VES",
            exchangeRate: 40,
            exchangeRateType: "official",
            updatedAt: AT(100),
        });
        let correctionEmitted = false;
        const push: PushFn = async ({ rows }) => {
            correctionEmitted = true;
            return { accepted: 0, nextSeq: 3, skipped: rows.length };
        };
        const pull = async ({ cursor }: { cursor: number; limit: number }) => ({
            cursor: correctionEmitted ? 2 : cursor,
            hasMore: false,
            rows: correctionEmitted
                ? [
                      txRow("t1", 2, 100, {
                          deviceId: "device-a",
                          fields: { currency: "VES", exchangeRateType: "custom" },
                      }),
                  ]
                : [],
        });

        await runSync(db, { pull, push });

        const [row] = await db.select().from(transactions);
        expect(row).toMatchObject({ amountUsd: null, exchangeRate: null, exchangeRateType: "custom" });
        await expect(getSyncCursor(db)).resolves.toBe(2);
        await expect(outboxPendingCount(db)).resolves.toBe(0);
    });

    it("replicates an account, dates as epochs and the local path withheld", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);

        await alpha.insert(accounts).values({
            currency: "EUR",
            dateCreated: AT(3000),
            id: "acct-1",
            imageUri: "file:///alpha/container/photo.jpg",
            initialBalance: 250,
            initialBalanceDate: AT(4000),
            initialBalanceUsd: 270,
            name: "Checking",
            sortOrder: 2,
            updatedAt: AT(3000),
        });
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);

        const [row] = await beta.select().from(accounts);
        expect(row.name).toBe("Checking");
        expect(row.currency).toBe("EUR");
        expect(row.initialBalance).toBe(250);
        expect(row.initialBalanceUsd).toBe(270);
        expect(row.initialBalanceDate.getTime()).toBe(4000);
        expect(row.dateCreated.getTime()).toBe(3000);
        expect(row.sortOrder).toBe(2);
        expect(row.imageUri).toBeNull();
        await expect(outboxPendingCount(beta)).resolves.toBe(0);
    });

    it("converges a concurrent edit to the same row on the later writer", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);

        await addTransaction(alpha, "t1", { note: "seed", updatedAt: AT(1000) });
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);

        await bumpNote(alpha, "t1", "from-alpha", 2000);
        await bumpNote(beta, "t1", "from-beta", 3000);
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);
        await runSync(alpha, server.transport);

        expect((await alpha.select().from(transactions))[0].note).toBe("from-beta");
        expect((await beta.select().from(transactions))[0].note).toBe("from-beta");
    });

    it("keeps a row deleted when a tombstone races an edit", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);

        await addTransaction(alpha, "t1", { updatedAt: AT(1000) });
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);

        // Beta's later edit still loses: R1 does not consult the clock.
        await tombstone(alpha, "t1", 2000);
        await bumpNote(beta, "t1", "still-here", 9000);
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);

        for (const db of [alpha, beta]) {
            const [row] = await db.select().from(transactions);
            expect(row.deletedAt).not.toBeNull();
        }
    });

    it("carries a restore from Recently Deleted to the other device, and a later delete back", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);
        const liveOn = async (db: Database) => (await db.select().from(transactions))[0].deletedAt === null;

        await addTransaction(alpha, "t1");
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);
        await transactionsRepo.remove(alpha, "t1", AT(2000));
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);

        await transactionsRepo.restore(beta, "t1", AT(3000));
        await runSync(beta, server.transport);
        await runSync(alpha, server.transport);
        await expect(liveOn(alpha)).resolves.toBe(true);

        await pullAndApply(alpha, async ({ limit }) => await server.pull({ cursor: 0, limit }));
        await expect(liveOn(alpha)).resolves.toBe(true);

        await transactionsRepo.remove(alpha, "t1", AT(4000));
        await runSync(alpha, server.transport);
        await runSync(beta, server.transport);
        await expect(liveOn(beta)).resolves.toBe(false);
    });

    it("rereads once after the upgrade: takes the restores it rejected, re-pushes the ones it made", async () => {
        const db = makeDb();
        const server = makeServer();
        const wire = (localId: string, at: number, extra: Partial<WireRow> = {}): WireRow => {
            const { deviceId: _deviceId, seq: _seq, ...row } = txRow(localId, 0, at, { deletedAt: at });
            return { ...row, ...extra };
        };
        await server.push({
            deviceId: "device-b",
            rows: [
                wire("restored-here", 2000),
                wire("restored-there", 2000),
                wire("restored-there", 2500, { deletedAt: null, restoredAt: 2500 }),
                wire("from-archive", 2000),
                wire("deleted", 2000),
            ],
        });
        await addTransaction(db, "restored-here", { updatedAt: AT(3000) });
        await addTransaction(db, "restored-there", { deletedAt: AT(2000), updatedAt: AT(2000) });
        await addTransaction(db, "from-archive", { updatedAt: AT(1500) });
        await addTransaction(db, "deleted", { deletedAt: AT(2000), updatedAt: AT(2000) });
        await setSyncEnabled(db, true);
        await setSyncCursor(db, 5);
        await setMeta(db, META_KEYS.syncRestoresReread, "1");

        await runSync(db, server.transport);
        await runSync(db, server.transport);

        const deletedAt = async (id: string) =>
            (await db.select().from(transactions).where(eqId(id)))[0].deletedAt?.getTime() ?? null;
        await expect(deletedAt("restored-there")).resolves.toBeNull();
        await expect(deletedAt("restored-here")).resolves.toBeNull();
        await expect(deletedAt("from-archive")).resolves.toBeNull();
        await expect(deletedAt("deleted")).resolves.toBe(2000);
        expect(server.rows.get("transactions restored-here")?.deletedAt).toBeNull();
        expect(server.rows.get("transactions from-archive")?.deletedAt).toBe(2000);
        await expect(getMeta(db, META_KEYS.syncRestoresReread)).resolves.toBeNull();
    });

    it("applies a pull without losing an unpushed local edit to another row", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);

        await addTransaction(alpha, "remote-row", { note: "from-alpha" });
        await runSync(alpha, server.transport);

        await addTransaction(beta, "local-row", { note: "unsent" });
        const applied = await pullAndApply(beta, server.pull);

        expect(applied.applied).toBe(1);
        await expect(outboxPendingCount(beta)).resolves.toBe(1);
        const notes = (await beta.select().from(transactions)).map((row) => row.note).sort();
        expect(notes).toStrictEqual(["from-alpha", "unsent"]);
    });

    it("settles after a full round trip with nothing left queued", async () => {
        const alpha = makeDb();
        const beta = makeDb();
        const server = makeServer();
        await setSyncEnabled(alpha, true);
        await setSyncEnabled(beta, true);

        await addTransaction(alpha, "t1");
        await addTransaction(beta, "t2");
        for (let round = 0; round < 3; round += 1) {
            await runSync(alpha, server.transport);
            await runSync(beta, server.transport);
        }

        await expect(outboxPendingCount(alpha)).resolves.toBe(0);
        await expect(outboxPendingCount(beta)).resolves.toBe(0);
        await expect(alpha.select().from(transactions)).resolves.toHaveLength(2);
        await expect(beta.select().from(transactions)).resolves.toHaveLength(2);
        const settled = await getSyncCursor(alpha);
        expect(settled).toBeGreaterThan(0);
        await expect(getSyncCursor(beta)).resolves.toBe(settled);
    });

    it("stops rather than looping when a page does not advance the cursor", async () => {
        const db = makeDb();
        await setSyncEnabled(db, true);
        let calls = 0;

        await pullAndApply(db, async () => {
            calls += 1;
            return { cursor: 0, hasMore: true, rows: [txRow("t1", 1, 5000)] };
        });

        expect(calls).toBe(1);
    });

    it("re-reads only the tables an older build skipped, leaving a restored entry live", async () => {
        const db = makeDb();
        const server = makeServer();
        await setSyncEnabled(db, true);
        server.rows.set("transactions restored", txRow("restored", 1, 5000, { deletedAt: 5000 }));
        server.rows.set("installmentPlans plan-1", {
            deletedAt: null,
            deviceId: "device-b",
            fields: { accountId: "acct-1", dateCreated: 4000, transactionId: "restored" },
            localId: "plan-1",
            seq: 2,
            table: "installmentPlans",
            updatedAt: 4000,
        });
        await addTransaction(db, "restored", { updatedAt: AT(6000) });
        await db.delete(outbox);
        await setMeta(db, META_KEYS.syncCursor, "9");
        await setMeta(db, META_KEYS.syncReread, "installmentPlans,installments,transfers");

        await pullAndApply(db, server.pull);

        const [entry] = await db.select().from(transactions).where(eqId("restored"));
        expect(entry?.deletedAt).toBeNull();
        await expect(db.select().from(installmentPlans)).resolves.toHaveLength(1);
        await expect(getSyncCursor(db)).resolves.toBe(9);
        await expect(getMeta(db, META_KEYS.syncReread)).resolves.toBeNull();
    });

    it("does not pull while the gate is shut", async () => {
        const db = makeDb();
        let calls = 0;

        await pullAndApply(db, async () => {
            calls += 1;
            return { cursor: 0, hasMore: false, rows: [] };
        });

        expect(calls).toBe(0);
    });
});

describe("a savings goal from a build that predates the start anchor", () => {
    function legacyGoal(overrides: { deletedAt?: number | null; targetDate?: number | null } = {}): PulledRow {
        return {
            deletedAt: overrides.deletedAt ?? null,
            deviceId: "device-b",
            fields: {
                accountId: "acct-1",
                currency: "USD",
                dateCreated: 1000,
                name: "Emergency fund",
                sortOrder: 0,
                targetAmount: 5000,
                targetAmountUsd: 5000,
                targetDate: overrides.targetDate === undefined ? 9000 : overrides.targetDate,
            },
            localId: "goal-1",
            seq: 1,
            table: "savingsGoals",
            updatedAt: 5000,
        };
    }

    async function withAccount(db: Database): Promise<void> {
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: AT(1000),
            id: "acct-1",
            initialBalance: 0,
            initialBalanceDate: AT(1000),
            name: "Savings",
            updatedAt: AT(1000),
        });
    }

    it("lands with the start anchor defaulted rather than nulled", async () => {
        const db = makeDb();
        await withAccount(db);

        await applyPulledRows(db, { cursor: 1, rows: [legacyGoal()] });

        const [row] = await db.select().from(savingsGoals);
        expect(row.startAmount).toBe(0);
        expect(row.startAmountUsd).toBe(0);
        expect(row.targetDate.getTime()).toBe(9000);
    });

    it("tombstones a dateless goal rather than keeping a copy the server has lost", async () => {
        const db = makeDb();
        await withAccount(db);

        const applied = await applyPulledRows(db, {
            cursor: 1,
            rows: [legacyGoal({ targetDate: null }), txRow("t-live", 2, 5000, { fields: { note: "kept" } })],
        });

        const [goal] = await db.select().from(savingsGoals);
        expect(goal.deletedAt).not.toBeNull();
        expect(applied.applied).toBe(2);
        const [kept] = await db.select().from(transactions);
        expect(kept.note).toBe("kept");
    });

    it("survives the migration when it was deleted before upgrading", async () => {
        // A deleted dateless goal survives the rebuild: dropping it would strand its offline delete's outbox entry,
        // which `drainOutbox` clears unpushed, so other devices would keep the goal.
        const db = makeDb();
        await withAccount(db);
        await applyPulledRows(db, { cursor: 1, rows: [legacyGoal({ deletedAt: 6000, targetDate: null })] });

        const [row] = await db.select().from(savingsGoals);
        expect(row.deletedAt).not.toBeNull();
        expect(row.targetDate).not.toBeNull();
    });

    it("still applies a dateless goal's tombstone, so a delete is never lost", async () => {
        const db = makeDb();
        await withAccount(db);
        await applyPulledRows(db, { cursor: 1, rows: [legacyGoal()] });

        await applyPulledRows(db, { cursor: 2, rows: [legacyGoal({ deletedAt: 6000, targetDate: null })] });

        const [row] = await db.select().from(savingsGoals);
        expect(row.deletedAt).not.toBeNull();
    });
});

describe("an account from a build that predates account kinds", () => {
    it("lands as an asset rather than failing the page", async () => {
        const db = makeDb();

        await applyPulledRows(db, {
            cursor: 1,
            rows: [
                {
                    deletedAt: null,
                    deviceId: "device-b",
                    fields: {
                        currency: "USD",
                        dateCreated: 1000,
                        initialBalance: 0,
                        initialBalanceDate: 1000,
                        name: "Savings",
                        sortOrder: 0,
                    },
                    localId: "acct-1",
                    seq: 1,
                    table: "accounts",
                    updatedAt: 5000,
                },
            ],
        });

        const [row] = await db.select().from(accounts);
        expect(row.kind).toBe("asset");
    });
});

async function bumpNote(db: Database, id: string, note: string, at: number): Promise<void> {
    await db
        .update(transactions)
        .set({ note, updatedAt: AT(at) })
        .where(eqId(id));
}

async function tombstone(db: Database, id: string, at: number): Promise<void> {
    await db
        .update(transactions)
        .set({ deletedAt: AT(at), updatedAt: AT(at) })
        .where(eqId(id));
}

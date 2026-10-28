import BetterSqlite3 from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { META_KEYS } from "@/data/app-meta-core";
import { SYNCED_META_KEYS, SYNCED_TABLES } from "@/data/sync-outbox-core";
import { applyMigrations } from "@/db/test-database";

function migrated(): BetterSqlite3.Database {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite);
    return sqlite;
}

interface OutboxRow {
    localId: string;
    seq: number;
    tableName: string;
}

function outbox(sqlite: BetterSqlite3.Database): OutboxRow[] {
    return sqlite.prepare("SELECT seq, tableName, localId FROM outbox ORDER BY seq").all() as OutboxRow[];
}

function setMeta(sqlite: BetterSqlite3.Database, key: string, value: string): void {
    sqlite
        .prepare("INSERT INTO appMeta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(key, value);
}

function enableSync(sqlite: BetterSqlite3.Database): void {
    setMeta(sqlite, "syncEnabled", "1");
}

function addCategory(sqlite: BetterSqlite3.Database, id: string): void {
    sqlite
        .prepare("INSERT INTO categories (id, name, income, sortOrder, updatedAt) VALUES (?, ?, 0, 0, 1)")
        .run(id, id);
}

function addTransaction(sqlite: BetterSqlite3.Database, id: string): void {
    sqlite
        .prepare(
            "INSERT INTO transactions (id, amount, income, note, date, day, month, " +
                "onceRecurring, recurringType, recurringCoefficient, updatedAt) " +
                "VALUES (?, 1, 0, '', 1, 1, 1, 0, 0, 1, 1)"
        )
        .run(id);
}

function addAccount(sqlite: BetterSqlite3.Database, id: string): void {
    sqlite
        .prepare(
            "INSERT INTO accounts (id, name, currency, initialBalance, " +
                "initialBalanceDate, sortOrder, dateCreated, updatedAt) " +
                "VALUES (?, ?, 'USD', 0, 1, 0, 1, 1)"
        )
        .run(id, id);
}

function applyPulledTransaction(sqlite: BetterSqlite3.Database, id: string, amount: number): void {
    sqlite
        .prepare(
            `INSERT INTO transactions (id, amount, income, date, day, month, updatedAt)
             VALUES (?, ?, 0, 1, 1, 1, 2)
             ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, updatedAt = excluded.updatedAt`
        )
        .run(id, amount);
}

describe("outbox triggers", () => {
    let sqlite: BetterSqlite3.Database;

    beforeEach(() => {
        sqlite = migrated();
    });

    it("enqueues nothing until sync is switched on", () => {
        addCategory(sqlite, "c1");
        addTransaction(sqlite, "t1");
        sqlite.prepare("UPDATE transactions SET note = 'x'").run();

        expect(outbox(sqlite)).toStrictEqual([]);
    });

    it("enqueues an insert on every replicated table", () => {
        enableSync(sqlite);

        addCategory(sqlite, "c1");
        addTransaction(sqlite, "t1");
        sqlite.prepare("INSERT INTO budgets (id, amount, type, green, updatedAt) VALUES ('b1', 1, 0, 0, 1)").run();
        sqlite.prepare("INSERT INTO mainBudget (id, amount, type, green, updatedAt) VALUES ('m1', 1, 0, 0, 1)").run();
        addAccount(sqlite, "a1");

        expect(outbox(sqlite).map((row) => [row.tableName, row.localId])).toStrictEqual([
            ["categories", "c1"],
            ["transactions", "t1"],
            ["budgets", "b1"],
            ["mainBudget", "m1"],
            ["accounts", "a1"],
        ]);
    });

    it("fires the accounts triggers on insert, update, and hard delete", () => {
        addAccount(sqlite, "a1");
        enableSync(sqlite);

        sqlite.prepare("UPDATE accounts SET deletedAt = 5, updatedAt = 5").run();
        expect(outbox(sqlite).map((row) => [row.tableName, row.localId])).toStrictEqual([["accounts", "a1"]]);

        sqlite.prepare("DELETE FROM accounts WHERE id = 'a1'").run();
        expect(outbox(sqlite)).toStrictEqual([]);
    });

    it("coalesces repeated writes to one row, with a fresh seq each time", () => {
        addTransaction(sqlite, "t1");
        enableSync(sqlite);

        const seqs: number[] = [];
        for (const note of ["a", "b", "c"]) {
            sqlite.prepare("UPDATE transactions SET note = ?").run(note);
            const rows = outbox(sqlite);
            expect(rows).toHaveLength(1);
            seqs.push(rows[0].seq);
        }

        expect(seqs[0] < seqs[1] && seqs[1] < seqs[2]).toBeTruthy();
    });

    it("keeps accepting a setting while its queue entry is still waiting", () => {
        enableSync(sqlite);

        setMeta(sqlite, "showCents", "false");
        const first = outbox(sqlite)[0].seq;
        setMeta(sqlite, "showCents", "true");

        expect(sqlite.prepare("SELECT value FROM appMeta WHERE key = 'showCents'").pluck().get()).toBe("true");
        const rows = outbox(sqlite);
        expect(rows).toHaveLength(1);
        expect(rows[0].seq > first).toBeTruthy();
    });

    it("holds one row per row a bulk write touches, however often it runs", () => {
        for (const id of ["t1", "t2", "t3", "t4", "t5"]) {
            addTransaction(sqlite, id);
        }
        enableSync(sqlite);

        sqlite.prepare("UPDATE transactions SET amountUsd = 2").run();
        expect(outbox(sqlite)).toHaveLength(5);

        sqlite.prepare("UPDATE transactions SET amountUsd = 3").run();
        sqlite.prepare("UPDATE transactions SET amountUsd = 4").run();
        expect(outbox(sqlite)).toHaveLength(5);
    });

    it("enqueues only the appMeta keys the allow-list names", () => {
        enableSync(sqlite);

        for (const key of SYNCED_META_KEYS) {
            setMeta(sqlite, key, "x");
        }
        const deviceLocal = Object.values(META_KEYS).filter(
            (key) => !SYNCED_META_KEYS.some((scoped) => scoped === key)
        );
        for (const key of deviceLocal) {
            setMeta(sqlite, key, "x");
        }

        expect(outbox(sqlite).map((row) => row.localId)).toStrictEqual([...SYNCED_META_KEYS]);
    });

    it("covers every table the sync layer claims to replicate", () => {
        const declared = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all() as {
            name: string;
        }[];
        const names = new Set(declared.map((row) => row.name));

        const missing = SYNCED_TABLES.flatMap((table) =>
            ["insert", "update", "delete"]
                .map((event) => `outbox_after_${event}_${table}`)
                .filter((trigger) => !names.has(trigger))
        );

        expect(missing).toStrictEqual([]);
    });

    it("does not let a drain delete an edit made after it read", () => {
        addTransaction(sqlite, "t1");
        enableSync(sqlite);
        sqlite.prepare("UPDATE transactions SET note = 'first'").run();

        const drained = outbox(sqlite).map((row) => row.seq);
        sqlite.prepare("UPDATE transactions SET note = 'second'").run();
        sqlite.prepare(`DELETE FROM outbox WHERE seq IN (${drained.join(",")})`).run();

        expect(outbox(sqlite).map((row) => row.localId)).toStrictEqual(["t1"]);
    });

    it("never reissues a seq the drain has already seen", () => {
        addTransaction(sqlite, "t1");
        enableSync(sqlite);
        sqlite.prepare("UPDATE transactions SET note = 'first'").run();

        const drained = outbox(sqlite)[0].seq;
        sqlite.prepare("DELETE FROM outbox").run();
        sqlite.prepare("UPDATE transactions SET note = 'second'").run();

        expect(outbox(sqlite)[0].seq > drained).toBeTruthy();
    });

    it("drops the queue entry when a row is hard-deleted", () => {
        addTransaction(sqlite, "t1");
        enableSync(sqlite);
        sqlite.prepare("UPDATE transactions SET note = 'x'").run();

        sqlite.prepare("DELETE FROM transactions WHERE id = 't1'").run();

        expect(outbox(sqlite)).toStrictEqual([]);
    });

    it("survives the applier's upsert on a row that is already queued", () => {
        enableSync(sqlite);
        addCategory(sqlite, "c1");
        addTransaction(sqlite, "t1");
        const queued = outbox(sqlite);

        expect(() => applyPulledTransaction(sqlite, "t1", 99)).not.toThrow();

        const after = outbox(sqlite).find((row) => row.localId === "t1");
        expect(after?.seq).toBeGreaterThan(queued.find((row) => row.localId === "t1")?.seq ?? 0);
    });

    it("leaves no trigger still relying on OR REPLACE", () => {
        const stale = sqlite
            .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND sql LIKE '%OR REPLACE%'")
            .all() as { name: string }[];

        expect(stale.map((row) => row.name)).toStrictEqual([]);
    });
});

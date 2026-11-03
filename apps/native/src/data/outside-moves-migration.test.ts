import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";

import { applyMigrations } from "@/db/test-database";

const INSTALLMENTS = "0033_installments";

function syncedBefore(migration: string): BetterSqlite3.Database {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite, (file) => file < migration);
    sqlite.exec("INSERT INTO appMeta (key, value) VALUES ('syncCursor', '42')");
    return sqlite;
}

function reread(sqlite: BetterSqlite3.Database): string | undefined {
    const row = sqlite.prepare("SELECT value FROM appMeta WHERE key = 'syncReread'").get() as
        | { value: string }
        | undefined;
    return row?.value;
}

describe("the migration that adds outside moves", () => {
    it("re-reads them on a synced device, on top of a re-read an older migration still owes", () => {
        const sqlite = syncedBefore(INSTALLMENTS);
        applyMigrations(sqlite, (file) => file >= INSTALLMENTS);

        expect(reread(sqlite)?.split(",")).toStrictEqual([
            "installmentPlans",
            "installments",
            "outsidePayments",
            "transfers",
            "outsideMoves",
            "transactionAttachments",
            "budgetPlans",
        ]);
    });
});

const ADJUSTMENT = "0047_outside_move_adjustment";

describe("the migration that marks balance adjustments", () => {
    it("flags the checks' notes on accounts, not a person's move that shares the words, and queues them", () => {
        const sqlite = new BetterSqlite3(":memory:");
        applyMigrations(sqlite, (file) => file < ADJUSTMENT);
        sqlite.exec(`
            INSERT INTO appMeta (key, value) VALUES ('syncEnabled', '1');
            INSERT INTO accounts (id, name, currency, kind, dateCreated, initialBalanceDate, updatedAt)
                VALUES ('bank', 'Banesco', 'VES', 'asset', 1, 1, 1), ('ana', 'Ana', 'VES', 'person', 1, 1, 1);
            INSERT INTO outsideMoves (id, accountId, amount, date, note, updatedAt) VALUES
                ('checked', 'bank', -5, 1, 'Ajuste de saldo', 1),
                ('typed', 'ana', -5, 1, 'Ajuste de saldo', 1),
                ('paid', 'bank', -5, 1, '', 1);
            DELETE FROM outbox;
        `);

        applyMigrations(sqlite, (file) => file >= ADJUSTMENT);

        expect(sqlite.prepare("SELECT id, adjustment FROM outsideMoves ORDER BY id").all()).toStrictEqual([
            { adjustment: 1, id: "checked" },
            { adjustment: 0, id: "paid" },
            { adjustment: 0, id: "typed" },
        ]);
        expect(sqlite.prepare("SELECT localId FROM outbox").all()).toStrictEqual([{ localId: "checked" }]);
    });
});

import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

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
        ]);
    });
});

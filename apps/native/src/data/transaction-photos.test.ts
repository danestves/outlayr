import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import { applyMigration, applyMigrations } from "@/db/test-database";

const PHOTOS_MIGRATION = "0011_transaction_photos.sql";

/** Raw SQL: the migration runs on the previous build's schema, which drizzle no longer describes. */
function ledgerBeforeThePhotosTable(): BetterSqlite3.Database {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite, (file) => file < PHOTOS_MIGRATION);
    sqlite.exec(`
		INSERT INTO categories (id, name, income, sortOrder, updatedAt)
		VALUES ('c1', 'Food', 0, 0, 1);
	`);
    return sqlite;
}

function insertTransaction(
    sqlite: BetterSqlite3.Database,
    id: string,
    columns: { imageUri?: string | null; imageKey?: string | null }
): void {
    sqlite
        .prepare(
            `INSERT INTO transactions
			 (id, amount, income, note, date, day, month, categoryId, imageUri, imageKey, imageColor, updatedAt)
			 VALUES (?, 10, 0, '', 1, 1, 1, 'c1', ?, ?, '#abcdef', 1)`
        )
        .run(id, columns.imageUri ?? null, columns.imageKey ?? null);
}

describe("moving existing photos into their own table", () => {
    it("carries a stored photo across rather than orphaning it", () => {
        const sqlite = ledgerBeforeThePhotosTable();
        insertTransaction(sqlite, "t1", {
            imageKey: "transaction-photos/u1/a.jpg",
            imageUri: "file:///photos/a.jpg",
        });

        applyMigration(sqlite, PHOTOS_MIGRATION);

        const rows = sqlite.prepare("SELECT * FROM transactionPhotos").all() as Record<string, unknown>[];
        expect(rows).toHaveLength(1);
        expect(rows[0].transactionId).toBe("t1");
        expect(rows[0].imageUri).toBe("file:///photos/a.jpg");
        expect(rows[0].imageKey).toBe("transaction-photos/u1/a.jpg");
        expect(rows[0].imageColor).toBe("#abcdef");
        expect(rows[0].sortOrder).toBe(0);
    });

    it("carries a row that has a key but no local file", () => {
        const sqlite = ledgerBeforeThePhotosTable();
        insertTransaction(sqlite, "t1", {
            imageKey: "transaction-photos/u1/a.jpg",
            imageUri: null,
        });

        applyMigration(sqlite, PHOTOS_MIGRATION);

        const rows = sqlite.prepare("SELECT * FROM transactionPhotos").all();
        expect(rows).toHaveLength(1);
    });

    it("leaves an entry that never had a photo alone", () => {
        const sqlite = ledgerBeforeThePhotosTable();
        insertTransaction(sqlite, "t1", { imageKey: null, imageUri: null });

        applyMigration(sqlite, PHOTOS_MIGRATION);

        expect(sqlite.prepare("SELECT * FROM transactionPhotos").all()).toStrictEqual([]);
    });

    it("gives every carried photo a distinct id", () => {
        const sqlite = ledgerBeforeThePhotosTable();
        insertTransaction(sqlite, "t1", { imageUri: "file:///a.jpg" });
        insertTransaction(sqlite, "t2", { imageUri: "file:///b.jpg" });

        applyMigration(sqlite, PHOTOS_MIGRATION);

        const ids = (
            sqlite.prepare("SELECT id FROM transactionPhotos").all() as {
                id: string;
            }[]
        ).map((row) => row.id);
        expect(new Set(ids).size).toBe(2);
    });
});

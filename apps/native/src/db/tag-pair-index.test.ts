import BetterSqlite3 from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { applyMigrations } from "@/db/test-database";

describe("the live-link pair index", () => {
    let sqlite: BetterSqlite3.Database;

    beforeEach(() => {
        sqlite = new BetterSqlite3(":memory:");
        applyMigrations(sqlite);
        sqlite
            .prepare(
                "INSERT INTO transactions (id, amount, income, note, date, day, month, " +
                    "onceRecurring, recurringType, recurringCoefficient, updatedAt) " +
                    "VALUES ('t1', 1, 0, '', 1, 1, 1, 0, 0, 1, 1)"
            )
            .run();
        sqlite.prepare("INSERT INTO tags (id, name, sortOrder, updatedAt) VALUES ('g1', 'coffee', 0, 1)").run();
    });

    const link = (id: string, deletedAt: number | null) =>
        sqlite
            .prepare(
                "INSERT INTO transactionTags (id, transactionId, tagId, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?)"
            )
            .run(id, "t1", "g1", 1, deletedAt);

    const links = () => (sqlite.prepare("SELECT COUNT(*) AS n FROM transactionTags").get() as { n: number }).n;

    it("lets a link from another device land on a pair this device retired", () => {
        link("a", 2);

        expect(() => link("b", null)).not.toThrow();
        expect(links()).toBe(2);
    });

    it("holds two retired links for the same pair, because both devices may have tombstoned it", () => {
        link("a", 2);

        expect(() => link("b", 3)).not.toThrow();
    });

    it("still refuses a second live link for the pair", () => {
        link("a", null);

        expect(() => link("b", null)).toThrow(/UNIQUE constraint failed/);
    });
});

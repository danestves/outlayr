import { beforeEach, describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import { applyMigrations } from "@/db/test-database";

describe("the live-budget category index", () => {
    let sqlite: BetterSqlite3.Database;

    beforeEach(() => {
        sqlite = new BetterSqlite3(":memory:");
        applyMigrations(sqlite);
        sqlite
            .prepare("INSERT INTO categories (id, name, income, sortOrder, updatedAt) VALUES ('c1', 'Food', 0, 0, 1)")
            .run();
    });

    const budget = (id: string, deletedAt: number | null) =>
        sqlite
            .prepare(
                "INSERT INTO budgets (id, amount, categoryId, type, updatedAt, deletedAt) VALUES (?, 1, 'c1', 2, 1, ?)"
            )
            .run(id, deletedAt);

    it("lets a pulled tombstone that kept its category land beside the live budget", () => {
        budget("live", null);

        expect(() => budget("gone", 2)).not.toThrow();
    });

    it("still refuses a second live budget for the category", () => {
        budget("a", null);

        expect(() => budget("b", null)).toThrow(/UNIQUE constraint failed/);
    });
});

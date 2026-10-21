import { beforeEach, describe, expect, it } from "@jest/globals";

import type { Database } from "@/db/client";
import { categories, transactionSplits, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { splitsForQuery, splitsRepo, UnbalancedSplitError } from "./splits-core";
import { transactionsRepo } from "./transactions-core";

async function seed(db: Database) {
    for (const [id, name] of [
        ["food", "Food"],
        ["travel", "Travel"],
    ]) {
        await db.insert(categories).values({
            id,
            income: false,
            name,
            sortOrder: 0,
            updatedAt: new Date(1),
        });
    }
    await db.insert(transactions).values({
        amount: 40,
        categoryId: "food",
        date: new Date(1),
        day: new Date(1),
        id: "t1",
        income: false,
        month: new Date(1),
        note: "",
        updatedAt: new Date(1),
    });
}

describe("splitsRepo", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        await seed(db);
    });

    it("writes the parts in the order they were given", async () => {
        await splitsRepo.writeSplit(
            db,
            "t1",
            40,
            [
                { amount: 25, categoryId: "food" },
                { amount: 15, categoryId: "travel" },
            ],
            2
        );

        expect((await splitsForQuery(db, "t1")).map((row) => [row.categoryId, row.amount])).toStrictEqual([
            ["food", 25],
            ["travel", 15],
        ]);
    });

    it("refuses a split that does not add up", async () => {
        await expect(splitsRepo.writeSplit(db, "t1", 40, [{ amount: 25, categoryId: "food" }], 2)).rejects.toThrow(
            UnbalancedSplitError
        );
        await expect(splitsForQuery(db, "t1")).resolves.toStrictEqual([]);
    });

    it("replaces a split wholesale rather than merging into it", async () => {
        await splitsRepo.writeSplit(
            db,
            "t1",
            40,
            [
                { amount: 25, categoryId: "food" },
                { amount: 15, categoryId: "travel" },
            ],
            2
        );
        await splitsRepo.writeSplit(db, "t1", 40, [{ amount: 40, categoryId: "travel" }], 2);

        expect((await splitsForQuery(db, "t1")).map((row) => [row.categoryId, row.amount])).toStrictEqual([
            ["travel", 40],
        ]);
    });

    it("leaves the replaced rows as tombstones so the change travels", async () => {
        await splitsRepo.writeSplit(db, "t1", 40, [{ amount: 40, categoryId: "food" }], 2);
        await splitsRepo.writeSplit(db, "t1", 40, [], 2);

        const all = await db.select().from(transactionSplits);
        expect(all).toHaveLength(1);
        expect(all[0].deletedAt).toBeTruthy();
    });

    it("retires the parts of an entry that is going", async () => {
        await splitsRepo.writeSplit(
            db,
            "t1",
            40,
            [
                { amount: 25, categoryId: "food" },
                { amount: 15, categoryId: "travel" },
            ],
            2
        );

        await splitsRepo.clearForTransactions(db, ["t1"]);

        await expect(splitsForQuery(db, "t1")).resolves.toStrictEqual([]);
    });

    it("does nothing when given no entries to clear", async () => {
        await splitsRepo.writeSplit(db, "t1", 40, [{ amount: 40, categoryId: "food" }], 2);
        await splitsRepo.clearForTransactions(db, []);
        await expect(splitsForQuery(db, "t1")).resolves.toHaveLength(1);
    });

    it("is not consulted for an entry that is gone", async () => {
        await splitsRepo.writeSplit(
            db,
            "t1",
            40,
            [
                { amount: 25, categoryId: "food" },
                { amount: 15, categoryId: "travel" },
            ],
            2
        );
        await transactionsRepo.remove(db, "t1");

        await expect(splitsForQuery(db, "t1")).resolves.toHaveLength(2);
    });
});

import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { transactions } from "@/db/schema";
import * as schema from "@/db/schema";

import { searchedTransactionsQuery } from "./log-search-core";

type TestDb = ReturnType<typeof makeDb>;

const at = (y: number, m: number, d: number, h = 0, min = 0): Date => new Date(y, m - 1, d, h, min, 0, 0);

const NOW = at(2025, 7, 15, 12).getTime();

function makeDb() {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			amount real NOT NULL,
			income integer NOT NULL,
			currency text,
			note text NOT NULL DEFAULT '',
			details text,
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
			icon text,
			emoji text,
			customColor text,
			imageColor text,
			imageUri text,
			imageKey text,
			onceRecurring integer NOT NULL DEFAULT 0,
			recurringType integer NOT NULL DEFAULT 0,
			recurringCoefficient integer NOT NULL DEFAULT 1,
			recurringEndDate integer,
			recurringAnchorDay integer,
			reminderLeadDays integer,
			categoryId text,
			accountId text,
			amountUsd real,
			exchangeRate real,
			exchangeRateType text,
			transferId text,
			feeForId text,
			feeRate real,
			paidVia text,
			installmentId text,
			restoredAt integer,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
	`);
    return drizzle(sqlite, { schema });
}

interface RowSeed {
    amount?: number;
    categoryId?: string;
    date: Date;
    deletedAt?: Date;
    details?: string;
    id: string;
    note?: string;
}

async function seed(db: TestDb, rows: RowSeed[]): Promise<void> {
    await db.insert(transactions).values(
        rows.map((row) => ({
            amount: row.amount ?? 10,
            categoryId: row.categoryId ?? null,
            date: row.date,
            day: at(row.date.getFullYear(), row.date.getMonth() + 1, row.date.getDate()),
            deletedAt: row.deletedAt ?? null,
            details: row.details ?? null,
            id: row.id,
            income: false,
            month: at(row.date.getFullYear(), row.date.getMonth() + 1, 1),
            note: row.note ?? "",
            updatedAt: new Date(0),
        }))
    );
}

async function search(db: TestDb, query: string, categoryIds: string[] = [], nowMs = NOW): Promise<string[]> {
    const rows = await searchedTransactionsQuery(db, {
        categoryIds,
        nowMs,
        query,
    });
    return rows.map((row) => row.id);
}

describe("search query", () => {
    it("matches a note containing the query, in any case", async () => {
        const db = makeDb();
        await seed(db, [
            { date: at(2025, 7, 14), id: "hit", note: "Weekly GROCERIES run" },
            { date: at(2025, 7, 14), id: "miss", note: "Petrol" },
        ]);

        await expect(search(db, "groceries")).resolves.toStrictEqual(["hit"]);
    });

    it("matches every row of a category whose name matched", async () => {
        const db = makeDb();
        await seed(db, [
            {
                categoryId: "cat-food",
                date: at(2025, 7, 14),
                id: "in-cat",
                note: "nothing textual to match",
            },
            { date: at(2025, 7, 14), id: "other", note: "nothing textual to match" },
        ]);

        await expect(search(db, "food", ["cat-food"])).resolves.toStrictEqual(["in-cat"]);
    });

    it("matches an exact amount when the query reads as a number", async () => {
        const db = makeDb();
        await seed(db, [
            { amount: 42, date: at(2025, 7, 14), id: "exact", note: "rent" },
            { amount: 4200, date: at(2025, 7, 13), id: "near", note: "rent" },
        ]);

        await expect(search(db, "42")).resolves.toStrictEqual(["exact"]);
    });

    it("excludes rows dated ahead of the clock, which have not been spent yet", async () => {
        const db = makeDb();
        await seed(db, [
            { amount: 1500, date: at(2025, 7, 1), id: "landed", note: "Rent" },
            { amount: 1500, date: at(2025, 8, 1), id: "scheduled", note: "Rent" },
        ]);

        await expect(search(db, "rent")).resolves.toStrictEqual(["landed"]);
    });

    it("excludes tombstones", async () => {
        const db = makeDb();
        await seed(db, [
            {
                date: at(2025, 7, 1),
                deletedAt: new Date(0),
                id: "gone",
                note: "Rent",
            },
        ]);

        await expect(search(db, "rent")).resolves.toStrictEqual([]);
    });

    it("matches nothing at all on an empty query", async () => {
        const db = makeDb();
        await seed(db, [{ date: at(2025, 7, 1), details: "anything", id: "any", note: "Rent" }]);

        await expect(search(db, "")).resolves.toStrictEqual([]);
    });

    it("returns newest first", async () => {
        const db = makeDb();
        await seed(db, [
            { date: at(2025, 7, 10), id: "middle", note: "Rent" },
            { date: at(2025, 7, 14), id: "newest", note: "Rent" },
            { date: at(2025, 6, 30), id: "oldest", note: "Rent" },
        ]);

        await expect(search(db, "rent")).resolves.toStrictEqual(["newest", "middle", "oldest"]);
    });
});

describe("search over the note's free text", () => {
    it("matches a row whose free text matched and whose note did not", async () => {
        const db = makeDb();
        await seed(db, [
            {
                date: at(2025, 7, 14),
                details: "Quarterly dentist deposit",
                id: "in-details",
                note: "Card 4471",
            },
            { date: at(2025, 7, 14), id: "other", note: "Card 4471" },
        ]);

        await expect(search(db, "dentist")).resolves.toStrictEqual(["in-details"]);
    });
});

describe("wildcards in the query", () => {
    it("matches a literal percent rather than standing for anything", async () => {
        const db = makeDb();
        await seed(db, [
            {
                amount: 12,
                date: at(2025, 7, 14),
                id: "literal",
                note: "50% off socks",
            },
            {
                amount: 13,
                date: at(2025, 7, 14),
                id: "wildcard-bait",
                note: "5000 off",
            },
        ]);

        await expect(search(db, "50%")).resolves.toStrictEqual(["literal"]);
    });
});

describe("the search projection", () => {
    const row = {
        date: at(2025, 7, 14),
        details: "Quarterly dentist deposit",
        id: "row",
        note: "Card 4471",
    };

    it("carries the free text, so a matched row can show why it matched", async () => {
        const db = makeDb();
        await seed(db, [row]);

        const rows = await searchedTransactionsQuery(db, {
            categoryIds: [],
            nowMs: NOW,
            query: "dentist",
        });

        expect(rows.map((found) => found.details)).toStrictEqual(["Quarterly dentist deposit"]);
    });
});

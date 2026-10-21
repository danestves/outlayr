import { beforeAll, describe, expect, it } from "@jest/globals";
import { lastMsBefore, spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { utcDateString } from "@outlayr/money/dates";
import { buildRateTable, sumValuedIn, valueDatedRowsIn, valueIn } from "@outlayr/money/valuation";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { categories, transactions } from "@/db/schema";
import * as schema from "@/db/schema";

import { expenseContributionQuery } from "./budget-spent";

type TestDb = ReturnType<typeof makeDb>;

const at = (y: number, m: number, day: number): Date => new Date(y, m - 1, day);
const WINDOW_START = at(2025, 1, 1);
const NOW = at(2025, 1, 31);

function makeDb() {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE categories (
			id text PRIMARY KEY NOT NULL,
			name text,
			color text DEFAULT '#FFFFFF',
			icon text,
			emoji text,
			income integer NOT NULL DEFAULT 0,
			sortOrder integer NOT NULL DEFAULT 0,
			dateCreated integer,
			parentId text,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
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

async function seed(db: TestDb): Promise<void> {
    const now = new Date();
    await db.insert(categories).values([
        { id: "food", income: false, name: "Food", sortOrder: 0, updatedAt: now },
        {
            id: "groc",
            income: false,
            name: "Groceries",
            parentId: "food",
            sortOrder: 1,
            updatedAt: now,
        },
        { id: "rent", income: false, name: "Rent", sortOrder: 2, updatedAt: now },
        { id: "sal", income: true, name: "Salary", sortOrder: 0, updatedAt: now },
    ]);
    const base = {
        day: WINDOW_START,
        month: WINDOW_START,
        note: "",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringType: 0,
        updatedAt: now,
    };
    await db.insert(transactions).values([
        {
            ...base,
            amount: 10,
            categoryId: "food",
            date: at(2025, 1, 10),
            id: "t-food",
            income: false,
        },
        {
            ...base,
            amount: 20,
            categoryId: "groc",
            date: at(2025, 1, 15),
            id: "t-groc",
            income: false,
        },
        {
            ...base,
            amount: 100,
            categoryId: "rent",
            date: at(2025, 1, 20),
            id: "t-rent",
            income: false,
        },
        {
            ...base,
            amount: 500,
            categoryId: "sal",
            date: at(2025, 1, 12),
            id: "t-inc",
            income: true,
        },
        {
            ...base,
            amount: 5,
            categoryId: "food",
            date: at(2024, 12, 20),
            id: "t-before",
            income: false,
        },
        {
            ...base,
            amount: 7,
            categoryId: "food",
            date: at(2025, 2, 5),
            id: "t-after",
            income: false,
        },
        {
            ...base,
            amount: 999,
            categoryId: "food",
            date: at(2025, 1, 18),
            deletedAt: now,
            id: "t-del",
            income: false,
        },
    ]);
}

// Mirrors the hooks' one expense query (live, income=false, date<=now), bucketed in JS.
const CONTRIBUTIONS: ExpenseContribution[] = [
    { amount: 10, categoryId: "food", date: at(2025, 1, 10), parentId: null },
    { amount: 20, categoryId: "groc", date: at(2025, 1, 15), parentId: "food" },
    { amount: 100, categoryId: "rent", date: at(2025, 1, 20), parentId: null },
    { amount: 5, categoryId: "food", date: at(2024, 12, 20), parentId: null },
];

describe("expenseContributionQuery", () => {
    let db: TestDb;
    beforeAll(async () => {
        db = makeDb();
        await seed(db);
    });

    it("admits only expenses, dated no later than now, never soft-deleted", async () => {
        const rows = await expenseContributionQuery(db, NOW);
        expect(rows.map((row) => row.amount).sort((a, b) => a - b)).toStrictEqual([5, 10, 20, 100]);
    });

    it("excludes a pending custom contribution from a foreign-currency budget scalar", async () => {
        const pendingDb = makeDb();
        await pendingDb.insert(transactions).values({
            amount: 40,
            amountUsd: null,
            currency: "VES",
            date: NOW,
            day: NOW,
            exchangeRate: null,
            exchangeRateType: "custom",
            id: "pending-custom",
            income: false,
            month: WINDOW_START,
            updatedAt: NOW,
        });
        const rows = await expenseContributionQuery(pendingDb, NOW);

        expect(valueDatedRowsIn(rows, "EUR", buildRateTable([]))).toStrictEqual([0]);
    });
});

describe("spentForCategory", () => {
    it("sums a category together with its subcategories", () => {
        expect(spentForCategory(CONTRIBUTIONS, "food", WINDOW_START, NOW)).toBe(30);
    });
});

describe("spentForMain", () => {
    it("sums every in-window expense across categories", () => {
        expect(spentForMain(CONTRIBUTIONS, WINDOW_START, NOW)).toBe(130);
    });
});

describe("a budget's spend does not depend on which list it is summed from", () => {
    const RATES = buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.8 }]);
    const JULY_15 = new Date(Date.UTC(2026, 6, 15, 12));
    const ROWS = [
        {
            amount: 40,
            amountUsd: 50,
            categoryId: "food",
            currency: "EUR",
            date: JULY_15,
        },
        {
            amount: 50,
            amountUsd: null,
            categoryId: "food",
            currency: "USD",
            date: JULY_15,
        },
    ];

    it("agrees with the shared expense list, in the display currency", () => {
        const shared: ExpenseContribution[] = ROWS.map((row) => ({
            amount: valueIn(
                {
                    amount: row.amount,
                    amountUsd: row.amountUsd,
                    currency: row.currency,
                    dateKey: utcDateString(row.date.getTime()),
                },
                "EUR",
                RATES
            ),
            categoryId: row.categoryId,
            date: row.date,
            parentId: null,
        }));

        const fromShared = spentForCategory(
            shared,
            "food",
            new Date(Date.UTC(2026, 6, 1)),
            new Date(Date.UTC(2026, 6, 31))
        );
        const fromDetail = sumValuedIn(ROWS, "EUR", RATES);

        expect(fromDetail).toBe(80);
        expect(fromDetail).toBe(fromShared);
    });
});

// `rolloverCarry` passes a half-open `[start, end)` while both spend functions count a row on their upper bound, and
// a CSV import dates every row at local midnight.
describe("a transaction dated exactly on a window boundary", () => {
    const FEB = at(2025, 2, 1);
    const MAR = at(2025, 3, 1);
    const onTheBoundary: ExpenseContribution[] = [{ amount: 40, categoryId: null, date: MAR, parentId: null }];

    it("is not counted in the window that ends there", () => {
        expect(spentForMain(onTheBoundary, FEB, lastMsBefore(MAR))).toBe(0);
    });

    it("is counted in the window that starts there", () => {
        expect(spentForMain(onTheBoundary, MAR, at(2025, 3, 31))).toBe(40);
    });

    it("counts once for a category budget too", () => {
        const rows: ExpenseContribution[] = [{ amount: 40, categoryId: "food", date: MAR, parentId: null }];

        expect(spentForCategory(rows, "food", FEB, lastMsBefore(MAR))).toBe(0);
        expect(spentForCategory(rows, "food", MAR, at(2025, 3, 31))).toBe(40);
    });
});

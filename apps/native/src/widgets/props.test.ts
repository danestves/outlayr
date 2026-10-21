import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import type { SpendDb } from "@/data/budget-spent";
import { appMeta, budgets, categories, mainBudget, transactions } from "@/db/schema";
import { testSpendDb } from "@/db/test-database";

import { buildWidgetProps } from "./props";

function makeDb(): SpendDb {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE appMeta (
			key text PRIMARY KEY NOT NULL,
			value text
		);
		CREATE TABLE exchangeRates (
			quote text NOT NULL,
			rateType text NOT NULL,
			date text NOT NULL,
			rate real NOT NULL,
			source text NOT NULL,
			fetchedAt integer NOT NULL,
			PRIMARY KEY (quote, rateType, date)
		);
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
		CREATE TABLE budgets (
			id text PRIMARY KEY NOT NULL,
			name text,
			amount real NOT NULL,
			type integer NOT NULL,
			startDate integer,
			dateCreated integer,
			green integer NOT NULL DEFAULT 0,
			rollover integer NOT NULL DEFAULT 0,
			currency text,
			amountUsd real,
			categoryId text UNIQUE,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
		CREATE TABLE mainBudget (
			id text PRIMARY KEY NOT NULL,
			name text,
			amount real NOT NULL,
			type integer NOT NULL,
			startDate integer,
			dateCreated integer,
			green integer NOT NULL DEFAULT 0,
			rollover integer NOT NULL DEFAULT 0,
			currency text,
			amountUsd real,
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
    return testSpendDb(sqlite);
}

const NOW = new Date(Date.UTC(2026, 6, 28, 12));

describe("the Ledger widget's entries", () => {
    it("quotes an entry it cannot value in the currency it was kept in", async () => {
        const db = makeDb();
        await db.insert(categories).values({
            color: "#FF0000",
            id: "cat-1",
            income: false,
            name: "Food",
            updatedAt: NOW,
        });
        await db.insert(transactions).values({
            amount: 12_000,
            categoryId: "cat-1",
            currency: "JPY",
            date: NOW,
            day: NOW,
            id: "t1",
            income: false,
            month: NOW,
            note: "Ramen",
            updatedAt: NOW,
        });

        const props = await buildWidgetProps(db, NOW);

        expect(props.Ledger.entries).toHaveLength(1);
        expect(props.Ledger.entries[0]?.amount).toBe("¥12,000");
    });

    it("states an entry it can value in the display currency, like the headers above it", async () => {
        const db = makeDb();
        await db.insert(transactions).values({
            amount: 8770,
            amountUsd: 9.96,
            currency: "VES",
            date: NOW,
            day: NOW,
            id: "t1",
            income: false,
            month: NOW,
            note: "Farmatodo",
            updatedAt: NOW,
        });

        const props = await buildWidgetProps(db, NOW);

        expect(props.Ledger.entries[0]?.amount).toBe("$9.96");
        expect(props.Ledger.headers.today.spent.amount).toBe("$9.96");
    });

    it("falls back to the ledger's currency when the entry named none", async () => {
        const db = makeDb();
        await db.insert(transactions).values({
            amount: 18.5,
            currency: null,
            date: NOW,
            day: NOW,
            id: "t1",
            income: false,
            month: NOW,
            note: "Coffee",
            updatedAt: NOW,
        });

        const props = await buildWidgetProps(db, NOW);

        expect(props.Ledger.entries[0]?.amount).toBe("$18.50");
    });
});

describe("the Budget widget's selections", () => {
    async function withBudgets(overall: boolean): Promise<SpendDb> {
        const db = makeDb();
        await db.insert(categories).values([
            { id: "cat-1", income: false, name: "Food", updatedAt: NOW },
            { id: "cat-2", income: false, name: "Transit", updatedAt: NOW },
        ]);
        if (overall) {
            await db.insert(mainBudget).values({
                amount: 1000,
                id: "main",
                name: "Overall Budget",
                startDate: new Date(Date.UTC(2026, 6, 1)),
                type: 3,
                updatedAt: NOW,
            });
        }
        await db.insert(budgets).values([
            {
                amount: 100,
                categoryId: "cat-1",
                id: "b-food",
                startDate: new Date(Date.UTC(2026, 6, 1)),
                type: 3,
                updatedAt: NOW,
            },
            {
                amount: 100,
                categoryId: "cat-2",
                id: "b-transit",
                startDate: new Date(Date.UTC(2026, 6, 1)),
                type: 3,
                updatedAt: NOW,
            },
        ]);
        await db.insert(transactions).values([
            {
                amount: 90,
                categoryId: "cat-1",
                date: NOW,
                day: NOW,
                id: "t1",
                income: false,
                month: NOW,
                note: "Groceries",
                updatedAt: NOW,
            },
            {
                amount: 10,
                categoryId: "cat-2",
                date: NOW,
                day: NOW,
                id: "t2",
                income: false,
                month: NOW,
                note: "Bus",
                updatedAt: NOW,
            },
        ]);
        return db;
    }

    it("publishes the overall and the closest-to-its-limit budget side by side", async () => {
        const props = await buildWidgetProps(await withBudgets(true), NOW);

        expect(props.Budget.views.overall.name).toBe("Overall Budget");
        expect(props.Budget.views.worst.name).toBe("Food");
        expect(props.Budget.views.auto).toStrictEqual(props.Budget.views.overall);
    });

    it("names the same budget the Budgets screen ranks first", async () => {
        const db = await withBudgets(false);
        await db.insert(categories).values({ id: "cat-3", income: false, name: "Tips", updatedAt: NOW });
        await db.insert(budgets).values({
            amount: 10,
            categoryId: "cat-3",
            id: "b-tips",
            startDate: new Date(Date.UTC(2026, 6, 1)),
            type: 3,
            updatedAt: NOW,
        });
        // Food: 110 of 100, $10 over (1.1x). Tips: 12 of 10, $2 over (1.2x).
        await db.insert(transactions).values([
            {
                amount: 20,
                categoryId: "cat-1",
                date: NOW,
                day: NOW,
                id: "t3",
                income: false,
                month: NOW,
                note: "More groceries",
                updatedAt: NOW,
            },
            {
                amount: 12,
                categoryId: "cat-3",
                date: NOW,
                day: NOW,
                id: "t4",
                income: false,
                month: NOW,
                note: "Tip",
                updatedAt: NOW,
            },
        ]);

        const props = await buildWidgetProps(db, NOW);

        expect(props.Budget.views.worst.name).toBe("Food");
    });

    it("leaves the automatic view on the worst budget when there is no overall one", async () => {
        const props = await buildWidgetProps(await withBudgets(false), NOW);

        expect(props.Budget.views.overall.present).toBe(false);
        expect(props.Budget.views.auto).toStrictEqual(props.Budget.views.worst);
    });
});

describe("the Insights widget's windows", () => {
    it("publishes every period so a tile can be configured to one", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "insightsTimeFrame", value: "2" });

        const props = await buildWidgetProps(db, NOW);

        expect(Object.keys(props.Insights.windows).sort()).toStrictEqual(["month", "week", "year"]);
        expect(props.Insights.windows.week.periodLabel).toBe("THIS WEEK");
        expect(props.Insights.windows.year.periodLabel).toBe("THIS YEAR");
    });

    it("keeps the app's own period as what an unconfigured tile shows", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "insightsTimeFrame", value: "3" });

        const props = await buildWidgetProps(db, NOW);

        expect(props.Insights.defaultPeriod).toBe("year");
    });
});

describe("the watch's last 7 days", () => {
    it("totals each day's spending, oldest first, ending today", async () => {
        const db = makeDb();
        const daysAgo = (days: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days, 7);
        const rows = [
            { amount: 10, days: 0, id: "today", income: false },
            { amount: 50, days: 0, id: "salary", income: true },
            { amount: 20, days: 1, id: "yesterday", income: false },
            { amount: 5, days: 6, id: "first", income: false },
            { amount: 100, days: 7, id: "outside", income: false },
        ];
        await db.insert(transactions).values(
            rows.map(({ amount, days, id, income }) => ({
                amount,
                currency: "USD",
                date: daysAgo(days),
                day: daysAgo(days),
                id,
                income,
                month: daysAgo(days),
                note: "",
                updatedAt: NOW,
            }))
        );

        const { week } = await buildWidgetProps(db, NOW);

        expect(week.days.map((day) => day.value)).toStrictEqual([5, 0, 0, 0, 0, 20, 10]);
        expect(week.days.map((day) => day.label)).toStrictEqual(["W", "T", "F", "S", "S", "M", "T"]);
        expect(week.average).toBe("$5");
    });
});

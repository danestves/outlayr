import { describe, expect, it } from "@jest/globals";
import { cellFigures } from "@outlayr/money/currency-totals";
import { buildRateTable } from "@outlayr/money/valuation";
import BetterSqlite3 from "better-sqlite3";

import { transactions } from "@/db/schema";
import { testSpendDb } from "@/db/test-database";

import type { SpendDb } from "./budget-spent";
import { logCellQuery, toCurrencyCells } from "./cell-query";

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
    return testSpendDb(sqlite);
}

const NOW = new Date(Date.UTC(2026, 6, 31, 23));
const eurRates = buildRateTable([
    { date: "2026-07-01", quote: "EUR", rate: 0.9 },
    { date: "2026-07-10", quote: "EUR", rate: 0.95 },
]);

let seq = 0;
async function add(
    db: SpendDb,
    row: {
        amount: number;
        currency: string | null;
        amountUsd: number | null;
        date: Date;
        income?: boolean;
        exchangeRate?: number | null;
        exchangeRateType?: string | null;
    }
): Promise<void> {
    seq += 1;
    await db.insert(transactions).values({
        amount: row.amount,
        amountUsd: row.amountUsd,
        currency: row.currency,
        date: row.date,
        day: row.date,
        exchangeRate: row.exchangeRate ?? null,
        exchangeRateType: row.exchangeRateType ?? null,
        id: `t${seq}`,
        income: row.income ?? false,
        month: row.date,
        updatedAt: NOW,
    });
}

async function figures(db: SpendDb, globalCurrency: string) {
    const rows = await logCellQuery(db, null, NOW);
    return cellFigures(toCurrencyCells(rows), globalCurrency, eurRates);
}

describe("logCellQuery", () => {
    it("aggregates pending custom separately without losing the native cell amount", async () => {
        const db = makeDb();
        const date = new Date(Date.UTC(2026, 6, 5, 12));
        await add(db, { amount: 20, amountUsd: null, currency: "VES", date });
        await add(db, { amount: 40, amountUsd: null, currency: "VES", date, exchangeRateType: "custom" });
        const [cell] = toCurrencyCells(await logCellQuery(db, null, NOW));
        expect(cell).toMatchObject({
            amount: 60,
            rateNeededAmount: 40,
            rateNeededCount: 1,
            unconvertedAmount: 60,
            unconvertedCount: 2,
        });
    });

    it("keys each group by the row's UTC day, matching what JS derives", async () => {
        const db = makeDb();
        // 23:00 UTC on the 5th and 01:00 UTC on the 6th are the same local day in
        // much of the world and different UTC days. The rate lookup uses UTC, so the
        // grouping must too or the two paths disagree about which rate applies.
        await add(db, {
            amount: 10,
            amountUsd: 10,
            currency: "USD",
            date: new Date(Date.UTC(2026, 6, 5, 23)),
        });
        await add(db, {
            amount: 10,
            amountUsd: 10,
            currency: "USD",
            date: new Date(Date.UTC(2026, 6, 6, 1)),
        });
        const rows = await logCellQuery(db, null, NOW);
        expect(rows.map((row) => row.dateKey).sort()).toStrictEqual(["2026-07-05", "2026-07-06"]);
    });

    it("splits a group's canonicalized and uncanonicalized halves", async () => {
        const db = makeDb();
        await add(db, {
            amount: 100,
            amountUsd: 100,
            currency: "USD",
            date: new Date(Date.UTC(2026, 6, 5, 12)),
        });
        await add(db, {
            amount: 40,
            amountUsd: null,
            currency: "USD",
            date: new Date(Date.UTC(2026, 6, 5, 12)),
        });
        const rows = await logCellQuery(db, null, NOW);
        expect(rows).toHaveLength(1);
        const [cell] = toCurrencyCells(rows);
        expect(cell.amount).toBe(140);
        expect(cell.amountUsd).toBe(100);
        expect(cell.unconvertedAmount).toBe(40);
        expect(cell.count).toBe(2);
        expect(cell.unconvertedCount).toBe(1);
    });

    it("keeps income and expense apart inside a converted currency", async () => {
        const db = makeDb();
        const july5 = new Date(Date.UTC(2026, 6, 5, 12));
        await add(db, {
            amount: 100,
            amountUsd: 100,
            currency: "USD",
            date: july5,
        });
        await add(db, {
            amount: 200,
            amountUsd: 200,
            currency: "USD",
            date: july5,
            income: true,
        });
        await expect(figures(db, "EUR")).resolves.toStrictEqual([
            { count: 2, currencyCode: "EUR", expense: 90, income: 180 },
        ]);
    });

    it("leaves what it cannot convert in its own currency", async () => {
        const db = makeDb();
        await add(db, {
            amount: 60,
            amountUsd: 66.67,
            currency: "EUR",
            date: new Date(Date.UTC(2026, 6, 5, 12)),
        });
        await add(db, {
            amount: 25,
            amountUsd: null,
            currency: "GBP",
            date: new Date(Date.UTC(2026, 6, 5, 12)),
        });
        await expect(figures(db, "EUR")).resolves.toStrictEqual([
            { count: 1, currencyCode: "EUR", expense: 60, income: 0 },
            { count: 1, currencyCode: "GBP", expense: 25, income: 0 },
        ]);
    });

    it("skips deleted rows", async () => {
        const db = makeDb();
        await add(db, {
            amount: 100,
            amountUsd: 111,
            currency: "EUR",
            date: new Date(Date.UTC(2026, 6, 5, 12)),
        });
        await db.update(transactions).set({ deletedAt: NOW });
        await expect(figures(db, "EUR")).resolves.toStrictEqual([
            { count: 0, currencyCode: "EUR", expense: 0, income: 0 },
        ]);
    });
});

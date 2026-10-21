import { beforeEach, describe, expect, it } from "@jest/globals";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import BetterSqlite3 from "better-sqlite3";
import { asc, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { testDatabase } from "@/db/test-database";

import { backfillRecurring } from "./recurrence-backfill";
import { transactionsRepo } from "./transactions-core";
import type { TransactionInput } from "./transactions-core";

const NOW = new Date(2025, 5, 15, 10, 30);

/** `create` commits before the back-fill walks the schedule; these tests cover the back-fill failing. */
const SUBSCRIPTION: TransactionInput = {
    amount: 9.99,
    categoryId: "bills",
    // Foreign on purpose: a USD amount never consults the rate replica these tests break.
    currency: "EUR",
    date: new Date(2025, 2, 15),
    details: null,
    income: false,
    note: "Netflix",
    onceRecurring: true,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.monthly,
    reminderLeadDays: null,
};

interface Harness {
    /** Drops the rate replica, failing the back-fill after the source row commits and before it is retired. */
    breakRateReplica: () => void;
    db: Database;
}

function makeDb(): Harness {
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
    return {
        breakRateReplica: () => sqlite.exec("DROP TABLE exchangeRates;"),
        db: testDatabase(sqlite),
    };
}

function liveRows(db: Database) {
    return db.select().from(transactions).where(isNull(transactions.deletedAt)).orderBy(asc(transactions.date));
}

describe("a subscription whose back-fill fails after the row is committed", () => {
    let harness: Harness;
    beforeEach(() => {
        harness = makeDb();
    });

    it("writes no charges, so the source is the whole ledger", async () => {
        const { db, breakRateReplica } = harness;
        const id = await transactionsRepo.create(db, SUBSCRIPTION);
        breakRateReplica();

        await expect(backfillRecurring(db, id, NOW)).rejects.toMatchObject({
            message: expect.any(String),
        });

        const rows = await liveRows(db);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(id);
    });

    it("leaves the schedule live for the next sweep to walk", async () => {
        const { db, breakRateReplica } = harness;
        const id = await transactionsRepo.create(db, SUBSCRIPTION);
        breakRateReplica();

        await expect(backfillRecurring(db, id, NOW)).rejects.toMatchObject({
            message: expect.any(String),
        });

        const [source] = await liveRows(db);
        expect(source?.recurringType).toBe(RECURRING_TYPE.monthly);
        expect(source?.recurringCoefficient).toBe(1);
        expect(source?.onceRecurring).toBe(true);
    });
});

describe("the day a saved schedule is anchored to", () => {
    let harness: Harness;
    beforeEach(() => {
        harness = makeDb();
    });

    it("stamps a subscription with its first payment's day of the month", async () => {
        const { db } = harness;

        const id = await transactionsRepo.create(db, {
            ...SUBSCRIPTION,
            date: new Date(2025, 0, 31),
        });

        const [row] = await liveRows(db);
        expect(row?.id).toBe(id);
        expect(row?.recurringAnchorDay).toBe(31);
    });
});

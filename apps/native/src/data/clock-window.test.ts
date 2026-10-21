import { describe, expect, it } from "@jest/globals";
import { startOfDay } from "@outlayr/money/calendar";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { transactions } from "@/db/schema";
import * as schema from "@/db/schema";
import { clockAdvances } from "@/domain/clock";

import { logWindowDaysQuery, logWindowRowsQuery } from "./transactions-core";

type TestDb = ReturnType<typeof makeDb>;

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

async function save(db: TestDb, id: string, date: Date): Promise<void> {
    await db.insert(transactions).values({
        amount: 12.5,
        date,
        day: startOfDay(date),
        id,
        income: false,
        month: new Date(date.getFullYear(), date.getMonth(), 1),
        note: id,
        updatedAt: date,
    });
}

async function listedAt(db: TestDb, nowMs: number): Promise<string[]> {
    const dayRows = await logWindowDaysQuery(db, nowMs, 30);
    const floorMs = dayRows.at(-1)?.day?.getTime() ?? null;
    const rows = await logWindowRowsQuery(db, nowMs, floorMs);
    return rows.map((row) => row.id);
}

describe("the ledger's upper bound against an advancing clock", () => {
    it("lists a row stamped just after the reading once the clock moves on", async () => {
        const db = makeDb();
        const reading = new Date(2025, 6, 15, 9, 41).getTime();
        // A transaction's date is `new Date()` at form mount, which is strictly later
        // than a reading the screen behind the form captured before it opened. 500ms
        // is enough: `date` is stored in milliseconds, so nothing truncates the gap.
        const saved = reading + 500;
        await save(db, "just-saved", new Date(saved));

        await expect(listedAt(db, reading)).resolves.toStrictEqual([]);
        expect(clockAdvances(reading, saved)).toBeTruthy();
        await expect(listedAt(db, saved)).resolves.toStrictEqual(["just-saved"]);
    });

    it("keeps hiding a row genuinely scheduled ahead once the clock moves on", async () => {
        const db = makeDb();
        const reading = new Date(2025, 6, 15, 9, 41).getTime();
        await save(db, "landed", new Date(reading - 60_000));
        await save(db, "scheduled", new Date(2025, 6, 20, 9, 0));

        await expect(listedAt(db, reading + 500)).resolves.toStrictEqual(["landed"]);
    });
});

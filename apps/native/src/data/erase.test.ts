import { beforeEach, describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";
import { isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { testDatabase } from "@/db/test-database";

import { eraseData } from "./erase";
import type { EraseResidue } from "./erase";

const TRANSACTIONS_DDL = `
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
`;

const TRANSFERS_DDL = `
		CREATE TABLE transfers (
			id text PRIMARY KEY NOT NULL,
			fromAccountId text NOT NULL,
			toAccountId text NOT NULL,
			fromAmount real NOT NULL,
			fromCurrency text NOT NULL,
			fromAmountUsd real,
			toAmount real NOT NULL,
			toCurrency text NOT NULL,
			toAmountUsd real,
			exchangeRate real,
			exchangeRateType text,
			installmentPlanId text,
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
			note text DEFAULT '' NOT NULL,
			dateCreated integer NOT NULL,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
`;

const INSTALLMENTS_DDL = `
	CREATE TABLE installmentPlans (
		id text PRIMARY KEY NOT NULL, accountId text NOT NULL, transactionId text NOT NULL,
		dateCreated integer NOT NULL, updatedAt integer NOT NULL, deletedAt integer, restoredAt integer
	);
	CREATE TABLE installments (
		id text PRIMARY KEY NOT NULL, planId text NOT NULL, sequence integer NOT NULL, dueDate integer NOT NULL,
		amount real NOT NULL, updatedAt integer NOT NULL, deletedAt integer, restoredAt integer
	);
	CREATE TABLE outsidePayments (
		id text PRIMARY KEY NOT NULL, planId text NOT NULL, date integer NOT NULL, amount real NOT NULL,
		amountUsd real, updatedAt integer NOT NULL, deletedAt integer, restoredAt integer
	);
	CREATE TABLE outsideMoves (
		id text PRIMARY KEY NOT NULL, accountId text NOT NULL, date integer NOT NULL, amount real NOT NULL,
		amountUsd real, note text DEFAULT '' NOT NULL, updatedAt integer NOT NULL, deletedAt integer, restoredAt integer
	);
`;

function makeDb(ddl = `${TRANSACTIONS_DDL}${TRANSFERS_DDL}${INSTALLMENTS_DDL}`): Database {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(ddl);
    return testDatabase(sqlite);
}

/** Missing `transfers`, so the ledger write throws part-way through. */
const makeUnwritableDb = (): Database => makeDb(TRANSACTIONS_DDL);

const AUTHORED = new Date("2026-03-04T10:00:00.000Z");

async function seed(db: Database): Promise<void> {
    await db.insert(transactions).values({
        amount: 12.4,
        date: AUTHORED,
        day: AUTHORED,
        id: "tx-1",
        imageUri: "file:///photos/tx-1.jpg",
        income: false,
        month: AUTHORED,
        note: "Flat white",
        updatedAt: AUTHORED,
    });
}

type Effect = "photos" | "spotlight";

/**
 * `"photos" in failures` rather than a truthiness check, so a step can be told
 * to throw a value that is itself falsy.
 */
function spyResidue(failures: { photos?: unknown; spotlight?: unknown } = {}): {
    calls: Effect[];
    residue: EraseResidue;
} {
    const calls: Effect[] = [];
    return {
        calls,
        residue: {
            clearSpotlight() {
                calls.push("spotlight");
                return "spotlight" in failures ? Promise.reject(failures.spotlight) : Promise.resolve();
            },
            clearStoredPhotos() {
                calls.push("photos");
                if ("photos" in failures) {
                    throw failures.photos;
                }
            },
        },
    };
}

const liveTransactions = (db: Database) => db.select().from(transactions).where(isNull(transactions.deletedAt));

describe("eraseData", () => {
    let db: Database;
    beforeEach(async () => {
        db = makeDb();
        await seed(db);
    });

    it("tombstones the ledger, clears the photos, then clears Spotlight", async () => {
        const { calls, residue } = spyResidue();

        await eraseData(db, "transactions", residue);

        expect(calls).toStrictEqual(["photos", "spotlight"]);
        await expect(liveTransactions(db)).resolves.toHaveLength(0);
    });

    // A Spotlight index nobody cleared keeps erased notes and amounts answering
    // device-wide search, so it must survive the photo step's failure.
    it("still clears Spotlight when the photo directory refuses to go", async () => {
        const busy = new Error("directory busy");
        const { calls, residue } = spyResidue({ photos: busy });

        await expect(eraseData(db, "transactions", residue)).rejects.toBe(busy);

        expect(calls).toStrictEqual(["photos", "spotlight"]);
    });

    // The rejection is the screen's only signal that the erase it just ran was
    // partial: the rows are gone and the files are not.
    it("leaves the ledger erased after the photo step failed", async () => {
        const { residue } = spyResidue({ photos: new Error("directory busy") });

        await expect(eraseData(db, "transactions", residue)).rejects.toThrow();

        await expect(liveTransactions(db)).resolves.toHaveLength(0);
        const [tombstone] = await db.select().from(transactions);
        expect(tombstone.deletedAt).not.toBeNull();
    });

    // A caught value is not always an Error, and treating a falsy one as "no
    // failure" would send the screen back with a clean confirmation.
    it("reports a photo step that threw a value of its own", async () => {
        const { calls, residue } = spyResidue({ photos: undefined });

        let rejected = false;
        let cause: unknown = "never thrown";
        try {
            await eraseData(db, "transactions", residue);
        } catch (error) {
            rejected = true;
            cause = error;
        }

        expect(rejected).toBe(true);
        expect(cause).toBeUndefined();
        expect(calls).toStrictEqual(["photos", "spotlight"]);
    });

    it("reports a Spotlight step that failed on its own", async () => {
        const denied = new Error("index unavailable");
        const { calls, residue } = spyResidue({ spotlight: denied });

        await expect(eraseData(db, "transactions", residue)).rejects.toBe(denied);

        expect(calls).toStrictEqual(["photos", "spotlight"]);
    });

    // Both stores still describe rows the user has, so clearing either would
    // delete a photo and un-index a transaction that was never erased.
    it("touches neither store when the ledger write fails", async () => {
        const unwritable = makeUnwritableDb();
        await seed(unwritable);
        const { calls, residue } = spyResidue();

        // `toMatchObject`, not `.rejects.toThrow()`: the rejection is a native-addon `SqliteError` from
        // another Jest realm, so `instanceof Error` fails and `toThrow()` reports "did not throw".
        await expect(eraseData(unwritable, "transactions", residue)).rejects.toMatchObject({
            message: expect.any(String),
        });

        expect(calls).toStrictEqual([]);
    });
});

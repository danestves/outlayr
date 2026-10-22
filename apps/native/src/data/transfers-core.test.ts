import { describe, expect, it } from "@jest/globals";
import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { utcDateString } from "@outlayr/money/dates";
import BetterSqlite3 from "better-sqlite3";
import { eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions, transfers } from "@/db/schema";
import { testDatabase, withAsyncTransactions } from "@/db/test-database";

import { accountsRepo } from "./accounts-core";
import { lastTransfer, sameSavedTransfer, savedTransfer, transfersRepo } from "./transfers-core";

const DAY = new Date(Date.UTC(2026, 7, 9));
const OFFICIAL_VES_PER_USD = 55.5;
const P2P_VES_PER_USD = 60;

function makeDb(): Database {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE appMeta (key text PRIMARY KEY NOT NULL, value text);
		CREATE TABLE accounts (
			id text PRIMARY KEY NOT NULL,
			name text NOT NULL,
			currency text NOT NULL,
			initialBalance real DEFAULT 0 NOT NULL,
			initialBalanceUsd real,
			initialBalanceDate integer NOT NULL,
			kind text NOT NULL DEFAULT 'asset',
			icon text, emoji text, customColor text, imageColor text, imageUri text, imageKey text,
			sortOrder integer DEFAULT 0 NOT NULL,
			dateCreated integer NOT NULL,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			amount real NOT NULL,
			income integer NOT NULL,
			currency text,
			note text NOT NULL DEFAULT '',
			details text, icon text, emoji text, customColor text, imageColor text, imageUri text, imageKey text,
			onceRecurring integer NOT NULL DEFAULT 0,
			recurringType integer NOT NULL DEFAULT 0,
			recurringCoefficient integer NOT NULL DEFAULT 1,
			recurringEndDate integer, recurringAnchorDay integer, reminderLeadDays integer,
			date integer NOT NULL, day integer NOT NULL, month integer NOT NULL,
			categoryId text, accountId text, amountUsd real, exchangeRate real, exchangeRateType text,
			transferId text,
			feeForId text,
			feeRate real,
			paidVia text,
			installmentId text,
			restoredAt integer,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
		CREATE TABLE transfers (
			id text PRIMARY KEY NOT NULL,
			fromAccountId text NOT NULL, toAccountId text NOT NULL,
			fromAmount real NOT NULL, fromCurrency text NOT NULL, fromAmountUsd real,
			toAmount real NOT NULL, toCurrency text NOT NULL, toAmountUsd real,
			exchangeRate real, exchangeRateType text, installmentPlanId text,
			date integer NOT NULL, day integer NOT NULL, month integer NOT NULL,
			note text DEFAULT '' NOT NULL,
			dateCreated integer NOT NULL, updatedAt integer NOT NULL, deletedAt integer
		);
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
			amountUsd real, note text DEFAULT '' NOT NULL, updatedAt integer NOT NULL, deletedAt integer,
			restoredAt integer
		);
		CREATE TABLE savingsGoals (accountId text NOT NULL, updatedAt integer NOT NULL, deletedAt integer);
		CREATE TABLE exchangeRates (
			quote text NOT NULL, rateType text NOT NULL, date text NOT NULL, rate real NOT NULL,
			fetchedAt integer NOT NULL, source text NOT NULL,
			PRIMARY KEY (quote, rateType, date)
		);
		INSERT INTO exchangeRates (quote, rateType, date, rate, fetchedAt, source)
		VALUES ('VES', 'official', '${utcDateString(DAY.getTime())}', ${OFFICIAL_VES_PER_USD}, 0, 'test');
	`);
    // withTransaction runs its task bare when the client has no async transaction
    // API, which would make every rollback assertion below vacuously true.
    withAsyncTransactions(sqlite);
    return testDatabase(sqlite);
}

function severTheDetach(db: Database): void {
    (db.$client as unknown as { exec: (sql: string) => void }).exec(`
		CREATE TRIGGER jetsam BEFORE UPDATE OF accountId ON transactions
		BEGIN SELECT RAISE(ABORT, 'the app died mid-delete'); END;
	`);
}

async function twoAccounts(db: Database) {
    const from = await accountsRepo.create(db, { currency: "USD", name: "Zinli" });
    const to = await accountsRepo.create(db, { currency: "VES", name: "Banesco" });
    return { from, to };
}

async function addEntry(db: Database, accountId: string, id: string): Promise<void> {
    await db.insert(transactions).values({
        accountId,
        amount: 9,
        date: DAY,
        day: DAY,
        id,
        income: false,
        month: DAY,
        updatedAt: DAY,
    });
}

const baseInput = (from: string, to: string) => ({
    date: DAY,
    exchangeRate: 55.5,
    exchangeRateType: "custom",
    fromAccountId: from,
    fromAmount: 100,
    fromCurrency: "USD",
    toAccountId: to,
    toAmount: 5550,
    toCurrency: "VES",
});

describe("transfersRepo.create", () => {
    it("stores the legs and the rate that links them", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        const id = await transfersRepo.create(db, baseInput(from, to));
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row).toMatchObject({
            exchangeRate: 55.5,
            exchangeRateType: "custom",
            fromAmount: 100,
            fromCurrency: "USD",
            toAmount: 5550,
            toCurrency: "VES",
        });
    });

    it("derives day and month from the date so the log can group it", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        const id = await transfersRepo.create(db, baseInput(from, to));
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row.day.getTime()).toBe(startOfDay(DAY).getTime());
        expect(row.month.getTime()).toBe(firstOfMonth(DAY).getTime());
    });

    /**
     * Deliberate: a transfer struck away from the market moves net worth by the
     * spread, because that is what happened. Pinning the arriving leg to what left
     * would deny a real gain.
     */
    it("books the spread when the user transfers at a rate the market does not quote", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            exchangeRate: P2P_VES_PER_USD,
            exchangeRateType: "custom",
            toAmount: 100 * P2P_VES_PER_USD,
        });
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row.fromAmountUsd).toBe(100);
        expect(row.toAmountUsd).toBeCloseTo((100 * P2P_VES_PER_USD) / OFFICIAL_VES_PER_USD, 5);
        expect(row.toAmountUsd).toBeGreaterThan(row.fromAmountUsd as number);
    });

    it("leaves only the leg it cannot price unvalued", async () => {
        const db = makeDb();
        const from = await accountsRepo.create(db, { currency: "ARS", name: "Galicia" });
        const to = await accountsRepo.create(db, { currency: "USD", name: "Zinli" });

        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            exchangeRate: 1200,
            exchangeRateType: "official",
            fromAmount: 120_000,
            fromCurrency: "ARS",
            toAmount: 100,
            toCurrency: "USD",
        });
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row.fromAmountUsd).toBeNull();
        expect(row.toAmountUsd).toBe(100);
    });

    it("writes no fee transaction when there is no fee", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        await transfersRepo.create(db, baseInput(from, to));

        await expect(db.select().from(transactions)).resolves.toStrictEqual([]);
    });

    it("writes a source-side fee as an expense on the source account", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
        });
        const [fee] = await db.select().from(transactions);

        expect(fee).toMatchObject({
            accountId: from,
            amount: 2.7,
            categoryId: null,
            currency: "USD",
            income: false,
            transferId: id,
        });
    });

    it("writes a destination-side fee in the destination currency and account", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 150, side: "destination" },
        });
        const [fee] = await db.select().from(transactions);

        expect(fee).toMatchObject({ accountId: to, amount: 150, currency: "VES", income: false });
    });

    it("refuses a transfer to the same account", async () => {
        const db = makeDb();
        const { from } = await twoAccounts(db);

        await expect(transfersRepo.create(db, baseInput(from, from))).rejects.toThrow(/same account/i);
    });

    it("refuses a non-positive leg", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);

        await expect(transfersRepo.create(db, { ...baseInput(from, to), fromAmount: 0 })).rejects.toThrow(/positive/i);
    });
});

describe("transfersRepo.update", () => {
    it("rewrites the legs and moves the fee to the other side in place", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } });
        const [before] = await db.select().from(transactions);

        await transfersRepo.update(db, id, {
            ...baseInput(from, to),
            fee: { amount: 150, side: "destination" },
            fromAmount: 110,
            toAmount: 6105,
        });
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));
        const fees = await db.select().from(transactions);

        expect(row).toMatchObject({ fromAmount: 110, toAmount: 6105 });
        expect(fees).toHaveLength(1);
        expect(fees[0]).toMatchObject({
            accountId: to,
            amount: 150,
            currency: "VES",
            deletedAt: null,
            id: before.id,
            transferId: id,
        });
    });

    it("tombstones the fee when the edit drops it", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } });

        await transfersRepo.update(db, id, baseInput(from, to));
        const [fee] = await db.select().from(transactions);

        expect(fee.deletedAt).not.toBeNull();
    });

    it("adds a fee to a transfer that had none", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));

        await transfersRepo.update(db, id, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } });
        const [fee] = await db.select().from(transactions);

        expect(fee).toMatchObject({ accountId: from, amount: 2.7, categoryId: null, income: false, transferId: id });
    });

    it("keeps the USD value frozen on legs the edit left alone", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            exchangeRate: OFFICIAL_VES_PER_USD,
            exchangeRateType: "official",
            toAmount: 100 * OFFICIAL_VES_PER_USD,
        });
        (db.$client as unknown as { exec: (sql: string) => void }).exec("DELETE FROM exchangeRates");

        await transfersRepo.update(db, id, {
            ...baseInput(from, to),
            exchangeRate: OFFICIAL_VES_PER_USD,
            exchangeRateType: "official",
            note: "rent",
            toAmount: 100 * OFFICIAL_VES_PER_USD,
        });
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row).toMatchObject({ fromAmountUsd: 100, note: "rent", toAmountUsd: 100 });
    });

    it("carries the frozen USD value through an amount edit once its day's rates are gone", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            exchangeRate: OFFICIAL_VES_PER_USD,
            exchangeRateType: "official",
            toAmount: 100 * OFFICIAL_VES_PER_USD,
        });
        (db.$client as unknown as { exec: (sql: string) => void }).exec("DELETE FROM exchangeRates");

        await transfersRepo.update(db, id, {
            ...baseInput(from, to),
            exchangeRate: OFFICIAL_VES_PER_USD,
            exchangeRateType: "official",
            fromAmount: 110,
            toAmount: 110 * OFFICIAL_VES_PER_USD,
        });
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row).toMatchObject({ fromAmountUsd: 110, toAmountUsd: 110 });
    });

    it("leaves exactly one live fee when sync left the transfer with two", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } });
        const [first] = await db.select().from(transactions);
        await db.insert(transactions).values({ ...first, id: "synced-twin" });

        await transfersRepo.update(db, id, { ...baseInput(from, to), fee: { amount: 5, side: "source" } });
        const live = await db.select().from(transactions).where(isNull(transactions.deletedAt));

        expect(live).toHaveLength(1);
        expect(live[0]).toMatchObject({ amount: 5, transferId: id });
    });

    it("adds no fee to a transfer deleted while its USD values were being frozen", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));

        const pending = transfersRepo.update(db, id, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
            fromAmount: 110,
        });
        await transfersRepo.softDelete(db, id, DAY);

        await expect(pending).rejects.toThrow(/no longer exists/);
        await expect(db.select().from(transactions)).resolves.toStrictEqual([]);
    });

    it("refuses to edit a transfer deleted while it was open, and leaves it deleted", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));
        await transfersRepo.softDelete(db, id, DAY);

        await expect(
            transfersRepo.update(db, id, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } })
        ).rejects.toThrow(/no longer exists/);
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row).toMatchObject({ deletedAt: DAY, fromAmount: 100 });
        await expect(db.select().from(transactions)).resolves.toStrictEqual([]);
    });
});

describe("savedTransfer", () => {
    it("reads what was sent and what arrived back from the legs and the fee", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const sourceFee = await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
        });
        const destinationFee = await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 150, side: "destination" },
        });

        expect(savedTransfer(db, sourceFee)).toMatchObject({
            arrived: 5550,
            fee: 2.7,
            feeSide: "source",
            rate: 55.5,
            rateType: "custom",
            sent: 102.7,
        });
        expect(savedTransfer(db, destinationFee)).toMatchObject({
            arrived: 5400,
            fee: 150,
            feeSide: "destination",
            sent: 100,
        });
    });

    it("tells a transfer read twice from one edited in between", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, { ...baseInput(from, to), fee: { amount: 2.7, side: "source" } });
        const read = () => {
            const saved = savedTransfer(db, id);
            if (saved === null) {
                throw new Error("The transfer is gone");
            }
            return saved;
        };
        const before = read();

        expect(sameSavedTransfer(before, read())).toBe(true);
        await transfersRepo.update(db, id, { ...baseInput(from, to), fee: { amount: 3, side: "source" } });
        expect(sameSavedTransfer(before, read())).toBe(false);
    });

    it("finds nothing behind a deleted transfer", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));
        await transfersRepo.softDelete(db, id, DAY);

        expect(savedTransfer(db, id)).toBeNull();
    });
});

describe("lastTransfer", () => {
    it("is the newest live transfer, past a deleted one", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const ids = [
            await transfersRepo.create(db, baseInput(from, to)),
            await transfersRepo.create(db, baseInput(from, to)),
            await transfersRepo.create(db, baseInput(from, to)),
        ];
        for (const [index, id] of ids.entries()) {
            await db
                .update(transfers)
                .set({ dateCreated: new Date(index + 1) })
                .where(eq(transfers.id, id));
        }
        await transfersRepo.softDelete(db, ids[2] ?? "", DAY);

        expect(lastTransfer(db)?.id).toBe(ids[1]);
    });
});

describe("transfersRepo.softDelete", () => {
    it("takes the fee transaction with it", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
        });

        await transfersRepo.softDelete(db, id, DAY);
        const [fee] = await db.select().from(transactions);

        expect(fee.deletedAt).not.toBeNull();
    });

    it("leaves an unrelated transaction alone", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));
        await addEntry(db, from, "other");

        await transfersRepo.softDelete(db, id, DAY);
        const [other] = await db.select().from(transactions).where(eq(transactions.id, "other"));

        expect(other.deletedAt).toBeNull();
    });
});

describe("deleting an account takes its transfers with it", () => {
    it("tombstones a transfer that leaves the deleted account", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));

        await accountsRepo.softDelete(db, from, DAY);
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row.deletedAt).not.toBeNull();
    });

    it("tombstones a transfer that arrives at the deleted account", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        const id = await transfersRepo.create(db, baseInput(from, to));

        await accountsRepo.softDelete(db, to, DAY);
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id));

        expect(row.deletedAt).not.toBeNull();
    });

    it("takes the fee with it, since a fee has no meaning without its transfer", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
        });

        await accountsRepo.softDelete(db, from, DAY);
        const [fee] = await db.select().from(transactions);

        expect(fee.deletedAt).not.toBeNull();
    });

    it("counts what a delete would take, for the confirmation copy", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        await transfersRepo.create(db, baseInput(from, to));
        await transfersRepo.create(db, { ...baseInput(to, from), fromCurrency: "VES", toCurrency: "USD" });

        await expect(transfersRepo.countForAccount(db, from)).resolves.toBe(2);
    });
});

describe("an account delete that cannot finish", () => {
    it("leaves every one of its transfers live", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        await transfersRepo.create(db, baseInput(from, to));
        await transfersRepo.create(db, baseInput(from, to));
        await transfersRepo.create(db, { ...baseInput(to, from), fromCurrency: "VES", toCurrency: "USD" });
        await addEntry(db, from, "groceries");
        severTheDetach(db);

        await expect(accountsRepo.softDelete(db, from, DAY)).rejects.toThrow(/mid-delete/);

        const rows = await db.select().from(transfers);
        expect(rows).toHaveLength(3);
        expect(rows.filter((row) => row.deletedAt === null)).toHaveLength(3);
        await expect(transfersRepo.countForAccount(db, from)).resolves.toBe(3);
        expect((await accountsRepo.listActive(db)).map((row) => row.id)).toContain(from);
        const [entry] = await db.select().from(transactions).where(eq(transactions.id, "groceries"));
        expect(entry.accountId).toBe(from);
    });

    it("leaves the fee transaction live with its transfer", async () => {
        const db = makeDb();
        const { from, to } = await twoAccounts(db);
        await transfersRepo.create(db, {
            ...baseInput(from, to),
            fee: { amount: 2.7, side: "source" },
        });
        severTheDetach(db);

        await expect(accountsRepo.softDelete(db, from, DAY)).rejects.toThrow(/mid-delete/);

        const [fee] = await db.select().from(transactions);
        expect(fee.deletedAt).toBeNull();
    });
});

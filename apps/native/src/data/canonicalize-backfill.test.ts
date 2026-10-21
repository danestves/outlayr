import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";
import { eq } from "drizzle-orm";

import { accounts, appMeta, budgets, exchangeRates, mainBudget, transactions } from "@/db/schema";
import { migratedDatabase, testSpendDb } from "@/db/test-database";

import { accountsRepo } from "./accounts-core";
import type { SpendDb } from "./budget-spent";
import {
    backfillBudgetUsd,
    backfillCanonicalUsd,
    backfillOpeningUsd,
    CANONICALIZE_BATCH,
    hasUncanonicalized,
    stampLedgerCurrency,
    valuationCoverage,
} from "./canonicalize-backfill";

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
			categoryId text,
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

const JULY_28 = new Date(Date.UTC(2026, 6, 28, 12));

async function seedRate(db: SpendDb): Promise<void> {
    await db.insert(exchangeRates).values({
        date: "2026-07-28",
        fetchedAt: JULY_28.getTime(),
        quote: "EUR",
        rate: 0.87775,
        rateType: "official",
        source: "frankfurter",
    });
}

let seq = 0;
async function add(
    db: SpendDb,
    row: {
        amount: number;
        currency: string | null;
        amountUsd?: number | null;
        exchangeRate?: number | null;
        exchangeRateType?: string | null;
        date?: Date;
    }
): Promise<string> {
    seq += 1;
    const id = `t${seq}`;
    const date = row.date ?? JULY_28;
    await db.insert(transactions).values({
        amount: row.amount,
        amountUsd: row.amountUsd ?? null,
        currency: row.currency,
        date,
        day: date,
        exchangeRate: row.exchangeRate ?? null,
        exchangeRateType: row.exchangeRateType ?? null,
        id,
        income: false,
        month: date,
        updatedAt: JULY_28,
    });
    return id;
}

describe("stampLedgerCurrency", () => {
    it("names the ledger's currency on rows that stated none", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "currency", value: "EUR" });
        await add(db, { amount: 18.5, currency: null });
        await add(db, { amount: 100, currency: "JPY" });

        await expect(stampLedgerCurrency(db)).resolves.toBe(1);
        const rows = await db.select({ currency: transactions.currency, id: transactions.id }).from(transactions);
        expect(rows.map((row) => row.currency).sort()).toStrictEqual(["EUR", "JPY"]);
    });

    it("refuses when the ledger never set one", async () => {
        const db = makeDb();
        await add(db, { amount: 10, currency: null });

        await expect(stampLedgerCurrency(db)).resolves.toBe(0);
        const [row] = await db.select({ currency: transactions.currency }).from(transactions);
        expect(row.currency).toBeNull();
    });

    it("stamps the default once the user has stated it", async () => {
        const db = makeDb();
        await db.insert(appMeta).values([
            { key: "currency", value: "USD" },
            { key: "currencyChosen", value: "true" },
        ]);
        await add(db, { amount: 10, currency: null });

        await expect(stampLedgerCurrency(db)).resolves.toBe(1);
        const [row] = await db.select({ currency: transactions.currency }).from(transactions);
        expect(row.currency).toBe("USD");
    });
});

describe("a row kept under a currency nobody stated", () => {
    it("is never frozen at rate 1", async () => {
        // Stamping the bootstrap default takes canonicalization's USD identity
        // branch, which turns "follow the setting" into a stored fact the user
        // never gave, and no later pass looks at the row again.
        const db = makeDb();
        await db.insert(appMeta).values({ key: "currency", value: "USD" });
        const id = await add(db, { amount: 18.5, currency: null });

        await stampLedgerCurrency(db);
        await backfillCanonicalUsd(db);

        const [row] = await db
            .select({
                amountUsd: transactions.amountUsd,
                currency: transactions.currency,
                exchangeRate: transactions.exchangeRate,
            })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row.currency).toBeNull();
        expect(row.amountUsd).toBeNull();
        expect(row.exchangeRate).toBeNull();
    });

    it("does not hold up a row the backfill can value", async () => {
        const db = makeDb();
        await seedRate(db);
        await db.insert(appMeta).values({ key: "currency", value: "USD" });
        await add(db, { amount: 18.5, currency: null });
        await add(db, { amount: 100, currency: "EUR" });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(1);
    });
});

describe("backfillCanonicalUsd", () => {
    it("completes a stored custom rate without replacing it", async () => {
        const db = makeDb();
        const id = await add(db, { amount: 100, currency: "EUR", exchangeRate: 0.8, exchangeRateType: "custom" });
        await expect(backfillCanonicalUsd(db)).resolves.toBe(1);
        const [row] = await db
            .select({
                amountUsd: transactions.amountUsd,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
            })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row).toStrictEqual({ amountUsd: 125, exchangeRate: 0.8, exchangeRateType: "custom" });
    });

    it("retries EUR-reference under its stored policy", async () => {
        const db = makeDb();
        await db.insert(exchangeRates).values({
            date: "2026-07-28",
            fetchedAt: JULY_28.getTime(),
            quote: "VES",
            rate: 50,
            rateType: "eur_reference",
            source: "frankfurter",
        });
        await seedRate(db);
        const id = await add(db, { amount: 100, currency: "VES", exchangeRateType: "eur_reference" });
        await expect(backfillCanonicalUsd(db)).resolves.toBe(1);
        const [row] = await db
            .select({ exchangeRate: transactions.exchangeRate, exchangeRateType: transactions.exchangeRateType })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row).toStrictEqual({ exchangeRate: 50, exchangeRateType: "eur_reference" });
    });

    it("never replaces a supplied provider rate while filling amountUsd", async () => {
        const db = makeDb();
        await seedRate(db);
        const id = await add(db, {
            amount: 100,
            currency: "EUR",
            exchangeRate: 0.8,
            exchangeRateType: "official",
        });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(1);
        const [row] = await db
            .select({
                amountUsd: transactions.amountUsd,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
            })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row).toStrictEqual({ amountUsd: 125, exchangeRate: 0.8, exchangeRateType: "official" });
    });

    it("does not count or rewrite a pending custom row even when an official rate exists", async () => {
        const db = makeDb();
        await seedRate(db);
        const id = await add(db, { amount: 100, currency: "EUR", exchangeRate: null, exchangeRateType: "custom" });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(0);
        const [row] = await db
            .select({
                amountUsd: transactions.amountUsd,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
            })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row).toStrictEqual({ amountUsd: null, exchangeRate: null, exchangeRateType: "custom" });
    });

    it("drops an unrepresentable custom rate from the retry backlog", async () => {
        const db = makeDb();
        const id = await add(db, {
            amount: Number.MAX_VALUE,
            currency: "VES",
            exchangeRate: Number.MIN_VALUE,
            exchangeRateType: "custom",
        });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(0);
        const [row] = await db
            .select({ exchangeRate: transactions.exchangeRate, exchangeRateType: transactions.exchangeRateType })
            .from(transactions)
            .where(eq(transactions.id, id));
        expect(row).toStrictEqual({ exchangeRate: null, exchangeRateType: "custom" });
        await expect(hasUncanonicalized(db)).resolves.toBe(false);
    });

    it("freezes a stamped foreign row at the rate of its own day", async () => {
        const db = makeDb();
        await seedRate(db);
        await db.insert(appMeta).values({ key: "currency", value: "USD" });
        await add(db, { amount: 100, currency: "EUR" });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(1);
        const [row] = await db
            .select({
                amountUsd: transactions.amountUsd,
                exchangeRate: transactions.exchangeRate,
                exchangeRateType: transactions.exchangeRateType,
            })
            .from(transactions);
        // 100 EUR / 0.87775: the divisor is currency-per-USD.
        expect(Math.round((row.amountUsd ?? 0) * 100) / 100).toBe(113.93);
        expect(row.exchangeRate).toBe(0.87775);
        expect(row.exchangeRateType).toBe("official");
    });

    it("leaves a row it cannot value for the next pass to retry", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "currency", value: "USD" });
        await add(db, { amount: 100, currency: "EUR" });

        await expect(backfillCanonicalUsd(db)).resolves.toBe(0);
        await expect(hasUncanonicalized(db)).resolves.toBe(true);
    });
});

describe("hasUncanonicalized", () => {
    it("does not count a row that states no currency", async () => {
        // `backfillCanonicalUsd` excludes those in SQL, so counting them as pending
        // leaves a ledger nobody ever named a currency for reporting a backlog no
        // pass can ever drain.
        const db = makeDb();
        await add(db, { amount: 18.5, currency: null });

        await expect(hasUncanonicalized(db)).resolves.toBe(false);
    });

    it("does not report pending custom as provider coverage backlog", async () => {
        const db = makeDb();
        await add(db, {
            amount: 100,
            currency: "VES",
            exchangeRate: null,
            exchangeRateType: "custom",
        });

        await expect(hasUncanonicalized(db)).resolves.toBe(false);
        await expect(valuationCoverage(db)).resolves.toStrictEqual({
            beyondRateHistory: 0,
            converted: 0,
            pending: 0,
        });
    });
});

describe("valuationCoverage", () => {
    it("reports nothing outstanding once every row is frozen", async () => {
        const db = makeDb();
        await add(db, { amount: 100, amountUsd: 113.9, currency: "EUR" });
        await add(db, { amount: 20, currency: null });

        await expect(valuationCoverage(db)).resolves.toStrictEqual({
            beyondRateHistory: 0,
            converted: 0,
            pending: 0,
        });
    });

    it("separates rows a later pull can reach from ones it never will", async () => {
        // The rate table holds EUR from 2026-07-28 on. An EUR row older than that
        // is not waiting for anything: every pull wipe-replaces the table with a
        // window that starts no earlier.
        const db = makeDb();
        await seedRate(db);
        await add(db, { amount: 100, amountUsd: 113.9, currency: "EUR" });
        await add(db, { amount: 40, currency: "EUR" });
        await add(db, {
            amount: 55,
            currency: "EUR",
            date: new Date(Date.UTC(2025, 0, 9, 12)),
        });

        await expect(valuationCoverage(db)).resolves.toStrictEqual({
            beyondRateHistory: 1,
            converted: 1,
            pending: 1,
        });
    });

    it("leaves a currency with no rates at all pending", async () => {
        // Rates for it may still arrive; "never" is not claimable from an absence.
        const db = makeDb();
        await seedRate(db);
        await add(db, {
            amount: 900,
            currency: "JPY",
            date: new Date(Date.UTC(2025, 0, 9, 12)),
        });

        await expect(valuationCoverage(db)).resolves.toStrictEqual({
            beyondRateHistory: 0,
            converted: 0,
            pending: 1,
        });
    });

    it("never calls a USD row unreachable", async () => {
        // It freezes at rate 1 with no rate consulted, however old it is.
        const db = makeDb();
        await seedRate(db);
        await add(db, {
            amount: 12,
            currency: "USD",
            date: new Date(Date.UTC(2020, 2, 1, 12)),
        });

        await expect(valuationCoverage(db)).resolves.toStrictEqual({
            beyondRateHistory: 0,
            converted: 0,
            pending: 1,
        });
    });
});

describe("stampLedgerCurrency over budgets", () => {
    it("names the ledger's currency on a budget that stated none", async () => {
        // Left bare, a budget's amount follows the display setting, so switching it
        // would restate a 2,400 target the user never touched.
        const db = makeDb();
        await db.insert(appMeta).values({ key: "currency", value: "EUR" });
        await db.insert(budgets).values({
            amount: 400,
            currency: null,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });
        await db.insert(mainBudget).values({
            amount: 2400,
            currency: null,
            id: "m1",
            type: 3,
            updatedAt: JULY_28,
        });

        // One transaction-less ledger: the count is the two budgets.
        await expect(stampLedgerCurrency(db)).resolves.toBe(2);
        const [b] = await db.select({ currency: budgets.currency }).from(budgets);
        const [m] = await db.select({ currency: mainBudget.currency }).from(mainBudget);
        expect(b.currency).toBe("EUR");
        expect(m.currency).toBe("EUR");
    });

    it("leaves a budget that already named one alone", async () => {
        const db = makeDb();
        await db.insert(appMeta).values({ key: "currency", value: "EUR" });
        await db.insert(budgets).values({
            amount: 400,
            currency: "GBP",
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(stampLedgerCurrency(db)).resolves.toBe(0);
        const [b] = await db.select({ currency: budgets.currency }).from(budgets);
        expect(b.currency).toBe("GBP");
    });
});

const JULY_1 = new Date(Date.UTC(2026, 6, 1, 12));

async function seedJulyRates(db: SpendDb): Promise<void> {
    await seedRate(db);
    await db.insert(exchangeRates).values({
        date: "2026-07-01",
        fetchedAt: JULY_1.getTime(),
        quote: "EUR",
        rate: 0.8,
        rateType: "official",
        source: "frankfurter",
    });
}

async function budgetUsd(db: SpendDb, id: string): Promise<number | null> {
    const [row] = await db.select({ amountUsd: budgets.amountUsd }).from(budgets).where(eq(budgets.id, id));
    return row?.amountUsd ?? null;
}

describe("backfillBudgetUsd", () => {
    it("values a target at the day it was created, not at today's rate", async () => {
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(1);
        // 400 / 0.8, not 400 / 0.87775: the divisor is currency-per-USD.
        await expect(budgetUsd(db, "b1")).resolves.toBe(500);
    });

    it("falls back to the window start when no creation date was kept", async () => {
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: null,
            id: "b1",
            startDate: JULY_1,
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(1);
        await expect(budgetUsd(db, "b1")).resolves.toBe(500);
    });

    it("skips a target that names no currency", async () => {
        // `stampLedgerCurrency` runs first; freezing it here would claim a currency
        // the user never stated.
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: null,
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(0);
        await expect(budgetUsd(db, "b1")).resolves.toBeNull();
    });

    it("leaves a target it cannot value for the next pass to retry", async () => {
        const db = makeDb();
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(0);
        await expect(budgetUsd(db, "b1")).resolves.toBeNull();
    });

    it("freezes a USD target without consulting a rate", async () => {
        const db = makeDb();
        await db.insert(budgets).values({
            amount: 400,
            currency: "USD",
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(1);
        await expect(budgetUsd(db, "b1")).resolves.toBe(400);
    });

    it("covers the main budget alongside the per-category ones", async () => {
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });
        await db.insert(mainBudget).values({
            amount: 2400,
            currency: "EUR",
            dateCreated: JULY_1,
            id: "m1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(2);
        const [m] = await db.select({ amountUsd: mainBudget.amountUsd }).from(mainBudget);
        expect(m.amountUsd).toBe(3000);
    });

    it("is a no-op on a second pass", async () => {
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: JULY_1,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await backfillBudgetUsd(db);
        await expect(backfillBudgetUsd(db)).resolves.toBe(0);
    });

    it("ignores a soft-deleted target", async () => {
        const db = makeDb();
        await seedJulyRates(db);
        await db.insert(budgets).values({
            amount: 400,
            currency: "EUR",
            dateCreated: JULY_1,
            deletedAt: JULY_28,
            id: "b1",
            type: 3,
            updatedAt: JULY_28,
        });

        await expect(backfillBudgetUsd(db)).resolves.toBe(0);
        await expect(budgetUsd(db, "b1")).resolves.toBeNull();
    });
});

describe("backfillCanonicalUsd over a backlog", () => {
    async function addMany(db: SpendDb, count: number, currency: string, firstId: number): Promise<void> {
        await db.insert(transactions).values(
            Array.from({ length: count }, (_, i) => ({
                amount: 100,
                amountUsd: null,
                currency,
                date: JULY_28,
                day: JULY_28,
                id: `r${String(firstId + i).padStart(5, "0")}`,
                income: false,
                month: JULY_28,
                updatedAt: JULY_28,
            }))
        );
    }

    it("drains a backlog wider than one batch in a single pass", async () => {
        const db = makeDb();
        await seedRate(db);
        const total = CANONICALIZE_BATCH + 60;
        await addMany(db, total, "EUR", 0);

        await expect(backfillCanonicalUsd(db)).resolves.toBe(total);
        await expect(hasUncanonicalized(db)).resolves.toBe(false);
    });

    it("does not skip the next batch after sanitizing an invalid custom row", async () => {
        const db = makeDb();
        await seedRate(db);
        await db.insert(transactions).values({
            amount: Number.MAX_VALUE,
            amountUsd: null,
            currency: "VES",
            date: JULY_28,
            day: JULY_28,
            exchangeRate: Number.MIN_VALUE,
            exchangeRateType: "custom",
            id: "r00000",
            income: false,
            month: JULY_28,
            updatedAt: JULY_28,
        });
        await addMany(db, CANONICALIZE_BATCH, "EUR", 1);

        await expect(backfillCanonicalUsd(db)).resolves.toBe(CANONICALIZE_BATCH);
        await expect(hasUncanonicalized(db)).resolves.toBe(false);
    });

    it("steps past rows it cannot value rather than re-reading them", async () => {
        // Unvaluable rows keep their place in the predicate, so a pass that does not
        // advance past them re-reads the same page until the app is killed.
        const db = makeDb();
        await seedRate(db);
        await addMany(db, CANONICALIZE_BATCH, "EUR", 0);
        await addMany(db, 300, "JPY", 1000);
        await addMany(db, 40, "EUR", 2000);

        await expect(backfillCanonicalUsd(db)).resolves.toBe(CANONICALIZE_BATCH + 40);
        await expect(hasUncanonicalized(db)).resolves.toBe(true);
    });
});

describe("backfillOpeningUsd", () => {
    it("values an opening saved before its rate arrived once the rate lands", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const id = await accountsRepo.create(db, {
            currency: "VES",
            initialBalance: -12_761.76,
            initialBalanceDate: new Date("2026-09-20T20:59:25Z"),
            name: "Mercantil",
        });
        await expect(backfillOpeningUsd(db)).resolves.toBe(0);

        await db.insert(exchangeRates).values({
            date: "2026-09-20",
            fetchedAt: 1,
            quote: "VES",
            rate: 1000,
            rateType: "official",
            source: "cotizave",
        });

        await expect(backfillOpeningUsd(db)).resolves.toBe(1);
        const [row] = await db
            .select({ initialBalanceUsd: accounts.initialBalanceUsd })
            .from(accounts)
            .where(eq(accounts.id, id));
        expect(row?.initialBalanceUsd).toBeCloseTo(-12.76176, 6);
        await expect(backfillOpeningUsd(db)).resolves.toBe(0);
    });
});

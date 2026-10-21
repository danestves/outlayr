import { beforeEach, describe, expect, it } from "@jest/globals";
import { accountBalance } from "@outlayr/money/account-balance";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { buildRateTable } from "@outlayr/money/valuation";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, exchangeRates, savingsGoals, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { accountsRepo, getAccountById, getLastUsedAccount, rememberLastUsedAccount } from "./accounts-core";
import { settledAccountCellQuery, toCurrencyCells } from "./cell-query";
import { candidateLogoIds } from "./logo-backfill-state";
import { deletedTransactionsQuery, transactionsRepo } from "./transactions-core";

const makeDb = () => migratedDatabase({ foreignKeys: false });

async function addRate(db: Database, quote: string, date: string, rate: number): Promise<void> {
    await db.insert(exchangeRates).values({
        date,
        fetchedAt: 1,
        quote,
        rate,
        rateType: "official",
        source: "frankfurter",
    });
}

const JAN_5 = new Date("2026-01-05T12:00:00.000Z");

describe("accountsRepo.create", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("stamps identity, dates, and an appended sortOrder", async () => {
        const before = Date.now();
        const first = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        const second = await accountsRepo.create(db, {
            currency: "USD",
            name: "Savings",
        });

        const row = getAccountById(db, first);
        expect(row?.name).toBe("Checking");
        expect(row?.currency).toBe("USD");
        expect(row?.initialBalance).toBe(0);
        expect(row?.sortOrder).toBe(0);
        expect(row?.dateCreated.getTime()).toBeGreaterThanOrEqual(before);
        expect(row?.updatedAt.getTime()).toBe(row?.dateCreated.getTime());
        expect(row?.initialBalanceDate.getTime()).toBeGreaterThanOrEqual(before);
        expect(row?.deletedAt).toBeNull();
        expect(getAccountById(db, second)?.sortOrder).toBe(1);
    });

    it("freezes a foreign opening balance at the rate of its own day", async () => {
        await addRate(db, "EUR", "2026-01-01", 0.8);

        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: 100,
            initialBalanceDate: JAN_5,
            name: "Girokonto",
        });

        const row = getAccountById(db, id);
        expect(row?.initialBalanceDate.getTime()).toBe(JAN_5.getTime());
        expect(row?.initialBalanceUsd).toBe(125);
    });

    it("keeps the sign of a negative opening balance through the freeze", async () => {
        await addRate(db, "EUR", "2026-01-01", 0.8);

        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: -40,
            initialBalanceDate: JAN_5,
            name: "Overdrawn",
        });

        const row = getAccountById(db, id);
        expect(row?.initialBalance).toBe(-40);
        expect(row?.initialBalanceUsd).toBe(-50);
    });

    it("leaves the freeze null when no rate reaches the day", async () => {
        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: 100,
            initialBalanceDate: JAN_5,
            name: "Cash",
        });

        expect(getAccountById(db, id)?.initialBalanceUsd).toBeNull();
    });
});

describe("accountsRepo.update", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("keeps the frozen USD value when the money fields do not move", async () => {
        await addRate(db, "EUR", "2026-01-01", 0.8);
        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: 100,
            initialBalanceDate: JAN_5,
            name: "Girokonto",
        });
        await db.delete(exchangeRates);

        await accountsRepo.update(db, id, { icon: "Bank", name: "Konto" });

        const row = getAccountById(db, id);
        expect(row?.name).toBe("Konto");
        expect(row?.icon).toBe("Bank");
        expect(row?.initialBalanceUsd).toBe(125);
    });

    it("re-freezes when the opening balance moves", async () => {
        await addRate(db, "EUR", "2026-01-01", 0.8);
        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: 100,
            initialBalanceDate: JAN_5,
            name: "Girokonto",
        });

        await accountsRepo.update(db, id, { initialBalance: 200 });

        expect(getAccountById(db, id)?.initialBalanceUsd).toBe(250);
    });

    it("re-freezes when the currency moves", async () => {
        await addRate(db, "EUR", "2026-01-01", 0.8);
        const id = await accountsRepo.create(db, {
            currency: "EUR",
            initialBalance: 100,
            initialBalanceDate: JAN_5,
            name: "Konto",
        });

        await accountsRepo.update(db, id, { currency: "USD" });

        expect(getAccountById(db, id)?.initialBalanceUsd).toBe(100);
    });

    it("clears the key when the logo is taken off", async () => {
        const id = await accountsRepo.create(db, {
            currency: "USD",
            imageKey: "transaction-photos/user/logo.jpg",
            imageUri: "file:///photos/logo.jpg",
            name: "Checking",
        });

        await accountsRepo.update(db, id, { imageUri: null });

        expect(getAccountById(db, id)?.imageKey).toBeNull();
    });

    it("keeps the key of a logo this device has yet to fetch", async () => {
        const id = await accountsRepo.create(db, {
            currency: "USD",
            imageKey: "transaction-photos/user/logo.jpg",
            name: "Checking",
        });

        await accountsRepo.update(db, id, { imageUri: null, name: "Renamed" });

        expect(getAccountById(db, id)?.imageKey).toBe("transaction-photos/user/logo.jpg");
    });

    it("stamps updatedAt", async () => {
        const id = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        const created = getAccountById(db, id)?.updatedAt.getTime() ?? 0;
        await new Promise((resolve) => {
            setTimeout(resolve, 2);
        });

        await accountsRepo.update(db, id, { name: "Renamed" });

        expect(getAccountById(db, id)?.updatedAt.getTime()).toBeGreaterThan(created);
    });
});

describe("accountsRepo lifecycle", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("softDelete tombstones and drops the row from listActive", async () => {
        const first = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        const second = await accountsRepo.create(db, {
            currency: "USD",
            name: "Savings",
        });

        await accountsRepo.softDelete(db, first);

        const rows = await accountsRepo.listActive(db);
        expect(rows.map((row) => row.id)).toStrictEqual([second]);
        const gone = (await db.select().from(accounts)).find((row) => row.id === first);
        expect(gone?.deletedAt).not.toBeNull();
        expect(gone?.updatedAt.getTime()).toBe(gone?.deletedAt?.getTime());
        expect(getAccountById(db, first)).toBeNull();
    });

    it("softDelete detaches the entries it kept, and leaves other accounts alone", async () => {
        const doomed = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        const kept = await accountsRepo.create(db, {
            currency: "USD",
            name: "Savings",
        });
        const detached = await transactionsRepo.create(db, {
            accountId: doomed,
            amount: 25,
            categoryId: "cat-1",
            currency: "USD",
            date: JAN_5,
            details: null,
            income: false,
            note: "Coffee",
        });
        const untouched = await transactionsRepo.create(db, {
            accountId: kept,
            amount: 10,
            categoryId: "cat-1",
            currency: "USD",
            date: JAN_5,
            details: null,
            income: false,
            note: "Tea",
        });

        await accountsRepo.softDelete(db, doomed);

        const rows = await db.select().from(transactions);
        const byId = new Map(rows.map((row) => [row.id, row]));
        expect(byId.get(detached)?.accountId).toBeNull();
        expect(byId.get(untouched)?.accountId).toBe(kept);
        expect((await candidateLogoIds(db)).get(detached)).toBe(byId.get(detached)?.updatedAt.getTime());
    });

    it("softDelete takes a person's own entries with them, schedule and all", async () => {
        const pedro = await accountsRepo.create(db, { currency: "USD", kind: "person", name: "Pedro" });
        const checking = await accountsRepo.create(db, { currency: "USD", name: "Checking" });
        const entry = { categoryId: "cat-1", currency: "USD", date: JAN_5, details: null };
        const sale = await transactionsRepo.create(db, {
            ...entry,
            accountId: pedro,
            amount: 40,
            income: true,
            note: "Sold on credit",
        });
        const lunch = await transactionsRepo.create(db, {
            ...entry,
            accountId: pedro,
            amount: 12,
            income: false,
            note: "Lunch",
            onceRecurring: true,
            recurringType: RECURRING_TYPE.monthly,
        });
        const coffee = await transactionsRepo.create(db, {
            ...entry,
            accountId: checking,
            amount: 3,
            income: false,
            note: "Coffee",
        });

        await accountsRepo.softDelete(db, pedro);

        const byId = new Map((await db.select().from(transactions)).map((row) => [row.id, row]));
        expect(byId.get(sale)?.deletedAt).toStrictEqual(expect.any(Date));
        expect(byId.get(lunch)?.deletedAt).toStrictEqual(expect.any(Date));
        // A tombstone that still holds its schedule is what the orphan repair revives.
        expect(byId.get(lunch)?.recurringType).toBe(RECURRING_TYPE.none);
        expect(byId.get(coffee)?.deletedAt).toBeNull();
    });

    it("a deleted person's entries are neither offered back nor restorable alone", async () => {
        const pedro = await accountsRepo.create(db, { currency: "USD", kind: "person", name: "Pedro" });
        const sale = await transactionsRepo.create(db, {
            accountId: pedro,
            amount: 40,
            categoryId: "cat-1",
            currency: "USD",
            date: JAN_5,
            details: null,
            income: true,
            note: "Sold on credit",
        });

        await accountsRepo.softDelete(db, pedro);
        await transactionsRepo.restore(db, sale);

        await expect(deletedTransactionsQuery(db)).resolves.toStrictEqual([]);
        const [row] = await db.select().from(transactions).where(eq(transactions.id, sale));
        expect(row?.deletedAt).toStrictEqual(expect.any(Date));
    });

    it("softDelete takes the account's savings goals with it", async () => {
        const pedro = await accountsRepo.create(db, { currency: "USD", kind: "person", name: "Pedro" });
        db.insert(savingsGoals)
            .values({
                accountId: pedro,
                currency: "USD",
                dateCreated: JAN_5,
                id: "goal-1",
                name: "Pedro",
                sortOrder: 0,
                targetAmount: 0,
                targetDate: JAN_5,
                updatedAt: JAN_5,
            })
            .run();

        await accountsRepo.softDelete(db, pedro);

        const [goal] = await db.select().from(savingsGoals);
        expect(goal?.deletedAt).toStrictEqual(expect.any(Date));
    });

    it("reorder assigns each id its array index and stamps updatedAt", async () => {
        const a = await accountsRepo.create(db, { currency: "USD", name: "A" });
        const b = await accountsRepo.create(db, { currency: "USD", name: "B" });
        const c = await accountsRepo.create(db, { currency: "USD", name: "C" });

        await accountsRepo.reorder(db, [c, a, b]);

        const rows = await accountsRepo.listActive(db);
        expect(rows.map((row) => row.id)).toStrictEqual([c, a, b]);
        expect(rows.map((row) => row.sortOrder)).toStrictEqual([0, 1, 2]);
    });
});

describe("settledAccountCellQuery", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    async function addEntry(id: string, overrides: Partial<typeof transactions.$inferInsert>): Promise<void> {
        await db.insert(transactions).values({
            amount: 10,
            amountUsd: 10,
            currency: "USD",
            date: JAN_5,
            day: JAN_5,
            id,
            income: false,
            month: JAN_5,
            note: id,
            updatedAt: JAN_5,
            ...overrides,
        });
    }

    it("aggregates only the account's live rows into cells", async () => {
        await addEntry("t1", { accountId: "a1", amount: 30, amountUsd: 30 });
        await addEntry("t2", {
            accountId: "a1",
            amount: 12,
            amountUsd: 12,
            income: true,
        });
        await addEntry("other-account", { accountId: "a2" });
        await addEntry("no-account", { accountId: null });
        await addEntry("deleted", { accountId: "a1", deletedAt: JAN_5 });

        const cells = toCurrencyCells(await settledAccountCellQuery(db, "a1", JAN_5));

        expect(cells).toHaveLength(2);
        const expense = cells.find((cell) => !cell.income);
        expect(expense?.amount).toBe(30);
        expect(expense?.amountUsd).toBe(30);
        expect(expense?.count).toBe(1);
        expect(expense?.dateKey).toBe("2026-01-05");
        const income = cells.find((cell) => cell.income);
        expect(income?.amount).toBe(12);
    });
});

describe("the last-used account", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("answers null before any save has attached", () => {
        expect(getLastUsedAccount(db)).toBeNull();
    });

    it("moves with the newest attachment", async () => {
        const first = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        const second = await accountsRepo.create(db, {
            currency: "USD",
            name: "Savings",
        });

        await rememberLastUsedAccount(db, first);
        await rememberLastUsedAccount(db, second);

        expect(getLastUsedAccount(db)?.id).toBe(second);
    });

    it("never defaults the next entry to a person", async () => {
        const pedro = await accountsRepo.create(db, { currency: "USD", kind: "person", name: "Pedro" });
        await rememberLastUsedAccount(db, pedro);

        expect(getLastUsedAccount(db)).toBeNull();
    });

    it("answers null once the remembered account is deleted", async () => {
        const id = await accountsRepo.create(db, {
            currency: "USD",
            name: "Checking",
        });
        await rememberLastUsedAccount(db, id);

        await accountsRepo.softDelete(db, id);

        expect(getLastUsedAccount(db)).toBeNull();
    });
});

describe("an attached entry moving the balance", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    async function balanceOf(accountId: string, rates = buildRateTable([])) {
        const account = getAccountById(db, accountId);
        if (account == null) {
            throw new Error("Account not found.");
        }
        return accountBalance(account, toCurrencyCells(await settledAccountCellQuery(db, accountId, JAN_5)), rates);
    }

    it("shifts the balance in the account's own currency", async () => {
        const accountId = await accountsRepo.create(db, {
            currency: "USD",
            initialBalance: 100,
            name: "Checking",
        });
        expect((await balanceOf(accountId)).total).toBe(100);

        await transactionsRepo.create(db, {
            accountId,
            amount: 25,
            categoryId: "cat-1",
            currency: "USD",
            date: JAN_5,
            details: null,
            income: false,
            note: "Coffee",
        });
        expect((await balanceOf(accountId)).total).toBe(75);

        await transactionsRepo.create(db, {
            accountId,
            amount: 40,
            categoryId: "cat-1",
            currency: "USD",
            date: JAN_5,
            details: null,
            income: true,
            note: "Refund",
        });
        expect((await balanceOf(accountId)).total).toBe(115);
    });
});

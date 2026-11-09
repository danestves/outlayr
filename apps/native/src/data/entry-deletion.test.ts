import { accountDeletionPlan, categoryDeletionPlan, deletionPlan } from "@outlayr/money/entry-deletion";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import {
    accounts,
    budgetPlans,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    transactions,
    transfers,
} from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { accountsRepo } from "./accounts-core";
import { categoriesRepo } from "./categories-core";
import { transactionsRepo } from "./transactions-core";
import { transfersRepo } from "./transfers-core";

const AT = new Date(Date.UTC(2026, 10, 8, 12));
const EARLIER = new Date(AT.getTime() - 1000);
const NOW = new Date(AT.getTime() + 1000);

const entry = (id: string, extra: Partial<typeof transactions.$inferInsert> = {}) => ({
    amount: 10,
    date: AT,
    day: AT,
    id,
    income: false,
    month: AT,
    updatedAt: AT,
    ...extra,
});

const transfer = (id: string, extra: Partial<typeof transfers.$inferInsert> = {}) => ({
    date: AT,
    dateCreated: AT,
    day: AT,
    fromAccountId: "a",
    fromAmount: 5,
    fromCurrency: "USD",
    id,
    month: AT,
    toAccountId: "b",
    toAmount: 5,
    toCurrency: "USD",
    updatedAt: AT,
    ...extra,
});

const account = (id: string, kind: string) => ({
    currency: "USD",
    dateCreated: AT,
    id,
    initialBalanceDate: AT,
    kind,
    name: id,
    updatedAt: AT,
});

const goal = (id: string, accountId: string) => ({
    accountId,
    currency: "USD",
    dateCreated: AT,
    id,
    name: id,
    targetAmount: 100,
    targetDate: AT,
    updatedAt: AT,
});

async function seeded() {
    const db = migratedDatabase({ foreignKeys: false });
    await db
        .insert(accounts)
        .values([account("card", "liability"), account("cash", "asset"), account("ana", "person")]);
    await db.insert(categories).values([
        { id: "food", updatedAt: AT },
        { id: "snacks", parentId: "food", updatedAt: AT },
        { deletedAt: EARLIER, id: "old snacks", parentId: "food", updatedAt: AT },
        { id: "fees", updatedAt: AT },
        { id: "tagged", updatedAt: AT },
    ]);
    await db.insert(budgets).values([
        { amount: 300, categoryId: "food", id: "food budget", type: 0, updatedAt: AT },
        { amount: 300, categoryId: "fees", id: "fees budget", type: 0, updatedAt: AT },
    ]);
    await db.insert(budgetPlans).values([
        { categoryId: "food", id: "food in november", month: 202_611, updatedAt: AT },
        { categoryId: "fees", id: "fees in november", month: 202_611, updatedAt: AT },
    ]);
    await db
        .insert(transactions)
        .values([
            entry("coffee"),
            entry("card fee", { feeForId: "coffee" }),
            entry("old card fee", { deletedAt: EARLIER, feeForId: "coffee" }),
            entry("wire fee", { transferId: "move" }),
            entry("second wire fee", { transferId: "move" }),
            entry("orphaned wire fee", { transferId: "gone move" }),
            entry("financed"),
            entry("first payment", { installmentId: "i1" }),
            entry("old payment", { deletedAt: EARLIER, installmentId: "i2" }),
            entry("other plan payment", { installmentId: "other" }),
            entry("groceries", { accountId: "card", categoryId: "food" }),
            entry("groceries fee", { accountId: "card", categoryId: "fees", feeForId: "groceries" }),
            entry("groceries payment", { accountId: "cash", installmentId: "g1" }),
            entry("old lunch", { accountId: "card", categoryId: "food", deletedAt: EARLIER }),
            entry("payoff fee", { accountId: "cash", transferId: "payoff" }),
            entry("tagged wire fee", { categoryId: "tagged", transferId: "tagged move" }),
            entry("untagged wire fee", { transferId: "tagged move" }),
            entry("loan", { accountId: "ana" }),
            entry("loan fee", { accountId: "cash", feeForId: "loan" }),
            entry("old loan", { accountId: "ana", deletedAt: EARLIER }),
            entry("lend fee", { accountId: "ana", transferId: "lend" }),
        ]);
    await db
        .insert(transfers)
        .values([
            transfer("move"),
            transfer("still here"),
            transfer("gone move", { deletedAt: EARLIER }),
            transfer("payoff", { fromAccountId: "cash", toAccountId: "card" }),
            transfer("plan payment", { installmentPlanId: "groceries plan" }),
            transfer("tagged move"),
            transfer("lend", { fromAccountId: "cash", toAccountId: "ana" }),
        ]);
    await db.insert(installmentPlans).values([
        { accountId: "a", dateCreated: AT, id: "plan", transactionId: "financed", updatedAt: AT },
        { accountId: "a", dateCreated: AT, id: "other plan", transactionId: "coffee2", updatedAt: AT },
        { accountId: "card", dateCreated: AT, id: "groceries plan", transactionId: "groceries", updatedAt: AT },
    ]);
    await db.insert(installments).values([
        { amount: 1, dueDate: AT, id: "i1", planId: "plan", sequence: 0, updatedAt: AT },
        { amount: 1, dueDate: AT, id: "i2", planId: "plan", sequence: 1, updatedAt: AT },
        { amount: 1, dueDate: AT, id: "other", planId: "other plan", sequence: 0, updatedAt: AT },
        { amount: 1, dueDate: AT, id: "g1", planId: "groceries plan", sequence: 0, updatedAt: AT },
    ]);
    await db.insert(outsidePayments).values([
        { amount: 1, date: AT, id: "outside", planId: "plan", updatedAt: AT },
        { amount: 1, date: AT, id: "other outside", planId: "other plan", updatedAt: AT },
        { amount: 1, date: AT, id: "groceries outside", planId: "groceries plan", updatedAt: AT },
    ]);
    await db.insert(outsideMoves).values([
        { accountId: "card", amount: 1, date: AT, id: "card adjustment", updatedAt: AT },
        { accountId: "cash", amount: 1, date: AT, id: "cash adjustment", updatedAt: AT },
    ]);
    await db.insert(savingsGoals).values([goal("card goal", "card"), goal("cash goal", "cash")]);
    return db;
}

const TABLES = {
    accounts,
    budgetPlans,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    transactions,
    transfers,
};

type Table = keyof typeof TABLES;

const TABLE_NAMES = Object.keys(TABLES) as Table[];

const booksOf = async (db: Database) => ({
    accounts: await db.select().from(accounts),
    budgetPlans: await db.select().from(budgetPlans),
    budgets: await db.select().from(budgets),
    categories: await db.select().from(categories),
    installmentPlans: await db.select().from(installmentPlans),
    installments: await db.select().from(installments),
    outsideMoves: await db.select().from(outsideMoves),
    outsidePayments: await db.select().from(outsidePayments),
    savingsGoals: await db.select().from(savingsGoals),
    transactions: await db.select().from(transactions),
    transfers: await db.select().from(transfers),
});

type Books = Awaited<ReturnType<typeof booksOf>>;

const idsBy = (pick: (table: Table) => string[]) =>
    Object.fromEntries(TABLE_NAMES.map((table) => [table, new Set(pick(table))]));

/** A plan in the shape of a whole ledger: a table it does not name loses nothing. */
const planned = (gone: Partial<Record<Table, Set<string>>>) => idsBy((table) => [...(gone[table] ?? [])]);

/** What the write actually tombstoned, in the shape the plan answers in. */
const tombstonedSince = (books: Books, instant: Date) =>
    idsBy((table) => books[table].filter((row) => row.deletedAt?.getTime() === instant.getTime()).map((row) => row.id));

const linkOf = (books: Books) =>
    new Map<string, string | null>([
        ...books.categories.map((row) => [`categories ${row.id}`, row.parentId] as const),
        ...books.transactions.map((row) => [`transactions ${row.id}`, row.accountId] as const),
        ...books.transfers.map((row) => [`transfers ${row.id}`, row.installmentPlanId] as const),
    ]);

/** Rows the write kept but cut loose from what it deleted. */
function detachedBetween(before: Books, after: Books) {
    const was = linkOf(before);
    const is = linkOf(after);
    return idsBy((table) =>
        after[table]
            .filter((row) => is.get(`${table} ${row.id}`) !== was.get(`${table} ${row.id}`))
            .map((row) => row.id)
    );
}

describe("deletionPlan matches what native's delete writes", () => {
    it.each([
        ["a purchase and its card fee", "coffee"],
        ["a transfer's fee, which takes the transfer", "wire fee"],
        ["a financed purchase, with its plan and payments", "financed"],
    ])("%s", async (_name, id) => {
        const db = await seeded();
        const plan = deletionPlan(await booksOf(db), [id]);
        await Effect.runPromise(transactionsRepo.remove(db, id, NOW));
        expect(tombstonedSince(await booksOf(db), NOW)).toStrictEqual(planned(plan));
    });

    it.each(["move", "gone move"])("transfer %s and its live fees", async (id) => {
        const db = await seeded();
        const plan = deletionPlan(await booksOf(db), [id]);
        await Effect.runPromise(transfersRepo.softDelete(db, id, NOW));
        expect(tombstonedSince(await booksOf(db), NOW)).toStrictEqual(planned(plan));
    });

    it.each([
        ["with a financed purchase and its fee in another category", "food"],
        ["holding a transfer's fee, which takes the transfer", "tagged"],
    ])("a category %s", async (_name, id) => {
        const db = await seeded();
        const before = await booksOf(db);
        const { detached, ...gone } = categoryDeletionPlan(before, id);
        await Effect.runPromise(categoriesRepo.remove(db, id, NOW));
        const after = await booksOf(db);
        expect(tombstonedSince(after, NOW)).toStrictEqual(planned(gone));
        expect(detachedBetween(before, after)).toStrictEqual(planned(detached));
    });

    it.each([
        ["a card, which keeps its entries and loses its plans and transfers", "card"],
        ["a person, whose entries go with them", "ana"],
    ])("%s", async (_name, id) => {
        const db = await seeded();
        const before = await booksOf(db);
        const { detached, ...gone } = accountDeletionPlan(before, id);
        await Effect.runPromise(accountsRepo.softDelete(db, id, NOW));
        const after = await booksOf(db);
        expect(tombstonedSince(after, NOW)).toStrictEqual(planned(gone));
        expect(detachedBetween(before, after)).toStrictEqual(planned(detached));
    });
});

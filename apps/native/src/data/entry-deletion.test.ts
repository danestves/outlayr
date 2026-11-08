import { deletionPlan } from "@outlayr/money/entry-deletion";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

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

async function seeded() {
    const db = migratedDatabase({ foreignKeys: false });
    await db
        .insert(transactions)
        .values([
            entry("coffee"),
            entry("card fee", { feeForId: "coffee" }),
            entry("old card fee", { deletedAt: EARLIER, feeForId: "coffee" }),
            entry("wire fee", { transferId: "move" }),
            entry("second wire fee", { transferId: "move" }),
            entry("financed"),
            entry("first payment", { installmentId: "i1" }),
            entry("old payment", { deletedAt: EARLIER, installmentId: "i2" }),
            entry("other plan payment", { installmentId: "other" }),
        ]);
    await db.insert(transfers).values([transfer("move"), transfer("still here")]);
    await db.insert(installmentPlans).values([
        { accountId: "a", dateCreated: AT, id: "plan", transactionId: "financed", updatedAt: AT },
        { accountId: "a", dateCreated: AT, id: "other plan", transactionId: "coffee2", updatedAt: AT },
    ]);
    await db.insert(installments).values([
        { amount: 1, dueDate: AT, id: "i1", planId: "plan", sequence: 0, updatedAt: AT },
        { amount: 1, dueDate: AT, id: "i2", planId: "plan", sequence: 1, updatedAt: AT },
        { amount: 1, dueDate: AT, id: "other", planId: "other plan", sequence: 0, updatedAt: AT },
    ]);
    await db.insert(outsidePayments).values([
        { amount: 1, date: AT, id: "outside", planId: "plan", updatedAt: AT },
        { amount: 1, date: AT, id: "other outside", planId: "other plan", updatedAt: AT },
    ]);
    return db;
}

const TABLES = { installmentPlans, installments, outsidePayments, transactions, transfers };

const booksOf = async (db: Database) => ({
    installmentPlans: await db.select().from(installmentPlans),
    installments: await db.select().from(installments),
    outsidePayments: await db.select().from(outsidePayments),
    transactions: await db.select().from(transactions),
    transfers: await db.select().from(transfers),
});

/** What the write actually tombstoned, in the shape the plan answers in. */
async function tombstonedSince(db: Database, instant: Date) {
    const books = await booksOf(db);
    return Object.fromEntries(
        Object.keys(TABLES).map((table) => [
            table,
            new Set(
                books[table as keyof typeof TABLES]
                    .filter((row) => row.deletedAt?.getTime() === instant.getTime())
                    .map((row) => row.id)
            ),
        ])
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
        expect(plan).toStrictEqual(await tombstonedSince(db, NOW));
    });

    it("a transfer and its fees", async () => {
        const db = await seeded();
        const plan = deletionPlan(await booksOf(db), ["move"]);
        await Effect.runPromise(transfersRepo.softDelete(db, "move", NOW));
        expect(plan).toStrictEqual(await tombstonedSince(db, NOW));
    });
});

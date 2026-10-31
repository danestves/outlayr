import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import {
    accounts,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    transactions,
    transfers,
} from "@/db/schema";
import { transactionalDatabase } from "@/db/test-database";

import { expenseContributionQuery } from "./budget-spent";
import { logCellQuery, settledAccountsCellQuery } from "./cell-query";
import { commitDeferredDelete } from "./deferred-delete-registry";
import type { DeferredDeleteKind } from "./deferred-delete-registry";
import { planPaymentsQuery } from "./installments-core";
import { NO_PENDING_DELETES } from "./pending-deletes";
import type { PendingDeletes } from "./pending-deletes";
import { settledOutsideMovesQuery, settledOutsidePaymentsQuery, settledTransfersQuery } from "./transfer-cells";

const DAY = new Date(Date.UTC(2026, 7, 9, 12));
const NOW = new Date(Date.UTC(2026, 7, 10));
const STAMP = { updatedAt: DAY };

function entry(id: string, amount: number, links: Partial<typeof transactions.$inferInsert>) {
    return {
        amount,
        categoryId: "food",
        currency: "USD",
        date: DAY,
        day: DAY,
        id,
        income: false,
        month: DAY,
        ...STAMP,
        ...links,
    };
}

function transfer(id: string, fromAccountId: string, toAccountId: string, amount: number) {
    return {
        date: DAY,
        dateCreated: DAY,
        day: DAY,
        fromAccountId,
        fromAmount: amount,
        fromCurrency: "USD",
        id,
        month: DAY,
        toAccountId,
        toAmount: amount,
        toCurrency: "USD",
        ...STAMP,
    };
}

async function seed(db: Database) {
    const account = (id: string, kind: string) => ({
        currency: "USD",
        dateCreated: DAY,
        id,
        initialBalanceDate: DAY,
        kind,
        name: id,
        ...STAMP,
    });
    await db
        .insert(accounts)
        .values([
            account("cash", "asset"),
            account("bank", "asset"),
            account("cashea", "liability"),
            account("carlos", "person"),
        ]);
    await db.insert(categories).values([
        { id: "food", income: false, name: "Food", sortOrder: 0, ...STAMP },
        { id: "fun", income: false, name: "Fun", sortOrder: 1, ...STAMP },
    ]);
    await db
        .insert(transfers)
        .values([
            transfer("lent", "cash", "carlos", 50),
            transfer("salary", "bank", "cash", 20),
            { ...transfer("cuota-paid", "bank", "cashea", 25), installmentPlanId: "plan" },
        ]);
    await db
        .insert(installmentPlans)
        .values({ accountId: "cashea", dateCreated: DAY, id: "plan", transactionId: "purchase", ...STAMP });
    await db
        .insert(installments)
        .values({ amount: 25, dueDate: DAY, id: "cuota", planId: "plan", sequence: 1, ...STAMP });
    await db.insert(outsidePayments).values({ amount: 10, date: DAY, id: "down", planId: "plan", ...STAMP });
    await db.insert(outsideMoves).values({ accountId: "carlos", amount: 15, date: DAY, id: "handed", ...STAMP });
    await db
        .insert(transactions)
        .values([
            entry("lunch", 30, { accountId: "cash" }),
            entry("lunch-fee", 2, { accountId: "cash", feeForId: "lunch" }),
            entry("lent-fee", 1, { accountId: "cash", transferId: "lent" }),
            entry("on-credit", 10, { accountId: "carlos" }),
            entry("movie", 12, { accountId: "bank", categoryId: "fun" }),
            entry("purchase", 100, { accountId: "cashea" }),
            entry("cuota-fee", 3, { accountId: "cashea", installmentId: "cuota" }),
        ]);
}

async function figures(db: Database, pending: PendingDeletes) {
    const others = <Row extends { accountId: string | null }>(rows: Row[]) =>
        rows.filter((row) => pending.account === null || row.accountId !== pending.account);
    return {
        balances: others(await settledAccountsCellQuery(db, NOW, pending)),
        contributions: await expenseContributionQuery(db, NOW, null, pending),
        log: await logCellQuery(db, null, NOW, pending),
        moves: others(await settledOutsideMovesQuery(db, NOW, pending)),
        outside: others(await settledOutsidePaymentsQuery(db, NOW, pending)),
        plans: await planPaymentsQuery(db, pending),
        transfers: others(await settledTransfersQuery(db, NOW, pending)),
    };
}

const CASES: [string, DeferredDeleteKind, string][] = [
    ["an entry and its card fee", "row", "lunch"],
    ["a transfer and its fee", "row", "lent"],
    ["a transfer's fee, which takes the transfer", "row", "lent-fee"],
    ["an outside move", "row", "handed"],
    ["a purchase and its Cashea plan", "row", "purchase"],
    ["a person and everything recorded with them", "account", "carlos"],
    ["a bank account, whose entries stay", "account", "bank"],
    ["a category and its entries", "category", "fun"],
];

describe("figures during the undo window", () => {
    it.each(CASES)("already read %s as committed", async (_, kind, id) => {
        const db = transactionalDatabase({ foreignKeys: false });
        await seed(db);
        const pending = { ...NO_PENDING_DELETES, [kind]: id };
        const held = await figures(db, pending);
        expect(held).not.toStrictEqual(await figures(db, NO_PENDING_DELETES));

        await Effect.runPromise(commitDeferredDelete(kind, db, id));

        expect(held).toStrictEqual(await figures(db, NO_PENDING_DELETES));
    });
});

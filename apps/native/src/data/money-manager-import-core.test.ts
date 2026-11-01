import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import BetterSqlite3 from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { accounts, budgets, categories, transactions } from "@/db/schema";
import { transactionalDatabase } from "@/db/test-database";
import { analyzeSnapshot } from "@/domain/money-manager/analysis";
import { readMoneyManagerArchive } from "@/domain/money-manager/archive";
import { defaultChoices } from "@/domain/money-manager/defaults";
import { buildMoneyManagerFixture } from "@/domain/money-manager/fixture";
import { buildImportPlan } from "@/domain/money-manager/plan";
import { readMoneyManagerSnapshot } from "@/domain/money-manager/snapshot";
import type { SqlAll } from "@/domain/money-manager/snapshot";
import type { OutlayrLedgerState } from "@/domain/money-manager/types";

import { getMeta, META_KEYS } from "./app-meta-core";
import { budgetsRepo } from "./budgets-core";
import {
    applyMoneyManagerImport,
    lastMoneyManagerImport,
    MoneyManagerImportError,
    readLedgerState,
    undoMoneyManagerImport,
    verifyImportedBalances,
} from "./money-manager-import-core";
import { deletedTransactionsQuery, transactionsRepo } from "./transactions-core";

const EMPTY: OutlayrLedgerState = {
    accounts: [],
    budgetCategoryIds: [],
    categories: [],
    currency: "USD",
    currencyChosen: false,
    entries: [],
};

function planFromFixture(ledger: OutlayrLedgerState = EMPTY) {
    const archive = readMoneyManagerArchive(buildMoneyManagerFixture());
    if (!archive.ok) {
        throw new Error(archive.error.kind);
    }
    const sqlite = new BetterSqlite3(Buffer.from(archive.database));
    const all: SqlAll = (sql) => sqlite.prepare(sql).all() as Record<string, unknown>[];
    const snapshot = readMoneyManagerSnapshot(all);
    sqlite.close();
    const analysis = analyzeSnapshot(snapshot, ledger);
    return buildImportPlan(snapshot, analysis, defaultChoices(snapshot, analysis, ledger), ledger);
}

describe("applyMoneyManagerImport", () => {
    it("lands the backup, matches its balances, and undoes only the imported rows", async () => {
        const db = transactionalDatabase();
        const progress: [number, number][] = [];
        const record = await Effect.runPromise(
            applyMoneyManagerImport(db, planFromFixture(), (done, total) => {
                progress.push([done, total]);
            })
        );
        expect(progress.at(-1)).toStrictEqual([11, 11]);
        expect(record.accountIds).toHaveLength(4);
        expect(record.categoryIds).toHaveLength(5);
        expect(record.budgetIds).toHaveLength(2);
        expect(record.transactionIds).toHaveLength(9);
        expect(record.transferIds).toHaveLength(2);
        expect(record.adjustedAccountIds).toStrictEqual([record.accountKeys.spare]);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.currency))).resolves.toBe("USD");
        await expect(Effect.runPromise(getMeta(db, META_KEYS.currencyChosen))).resolves.toBe("true");

        const checks = await Effect.runPromise(verifyImportedBalances(db, record));
        expect(checks.length).toBeGreaterThan(0);
        expect(checks.every((check) => check.matches)).toBe(true);
        expect(checks.find((check) => check.accountId === record.accountKeys.spare)?.adjusted).toBe(true);

        const groceries = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.name, "Mercado"), isNull(categories.deletedAt)));
        const groceriesId = groceries[0]?.id;
        if (groceriesId == null || record.accountKeys.cash == null || record.transferIds[0] == null) {
            throw new Error("import did not create cash, groceries, or a transfer");
        }
        await Effect.runPromise(
            transactionsRepo.create(
                db,
                {
                    accountId: record.accountKeys.cash,
                    amount: 1,
                    categoryId: groceriesId,
                    currency: "USD",
                    date: new Date(),
                    details: null,
                    income: false,
                    note: "Mine",
                },
                { logoCandidate: false }
            )
        );
        const now = new Date();
        await db.insert(transactions).values({
            amount: 0.25,
            date: now,
            day: now,
            id: "fee-1",
            income: false,
            month: now,
            note: "Fee",
            transferId: record.transferIds[0],
            updatedAt: now,
        });

        const counts = await Effect.runPromise(undoMoneyManagerImport(db));
        expect(counts).toStrictEqual({ accounts: 3, budgets: 2, categories: 4, transactions: 10, transfers: 2 });
        const liveNotes = await db
            .select({ note: transactions.note })
            .from(transactions)
            .where(isNull(transactions.deletedAt));
        expect(liveNotes.map((row) => row.note)).toStrictEqual(["Mine"]);
        await expect(deletedTransactionsQuery(db)).resolves.toHaveLength(0);
        const liveCategories = await db
            .select({ name: categories.name })
            .from(categories)
            .where(isNull(categories.deletedAt));
        expect(liveCategories.map((row) => row.name)).toStrictEqual(["Mercado"]);
        const liveAccounts = await db.select({ name: accounts.name }).from(accounts).where(isNull(accounts.deletedAt));
        expect(liveAccounts.map((row) => row.name)).toStrictEqual(["Cash"]);
        await expect(Effect.runPromise(lastMoneyManagerImport(db))).resolves.toBeNull();
        await expect(Effect.runPromise(undoMoneyManagerImport(db))).resolves.toStrictEqual({
            accounts: 0,
            budgets: 0,
            categories: 0,
            transactions: 0,
            transfers: 0,
        });
    });

    it("renames an untouched seeded category to the Money Manager name and undo puts it back", async () => {
        const db = transactionalDatabase();
        const now = new Date();
        await db.insert(categories).values({
            color: "#53915A",
            customName: false,
            dateCreated: now,
            icon: "ShoppingCart01",
            id: "seed-groceries",
            income: false,
            name: "Groceries",
            preset: "Groceries",
            sortOrder: 0,
            updatedAt: now,
        });
        const seeded = () =>
            db
                .select({ customName: categories.customName, name: categories.name })
                .from(categories)
                .where(eq(categories.id, "seed-groceries"));

        const ledger = await Effect.runPromise(readLedgerState(db));
        const record = await Effect.runPromise(applyMoneyManagerImport(db, planFromFixture(ledger)));
        expect(record.categoryIds).not.toContain("seed-groceries");
        await expect(seeded()).resolves.toStrictEqual([{ customName: true, name: "Mercado" }]);

        await Effect.runPromise(undoMoneyManagerImport(db));
        await expect(seeded()).resolves.toStrictEqual([{ customName: false, name: "Groceries" }]);
    });

    it("keeps an imported category on undo once the user has budgeted it", async () => {
        const db = transactionalDatabase();
        const record = await Effect.runPromise(applyMoneyManagerImport(db, planFromFixture()));
        const imported = await db.select({ categoryId: budgets.categoryId }).from(budgets);
        const budgeted = new Set(imported.map((row) => row.categoryId));
        const free = record.categoryIds.find((id) => !budgeted.has(id));
        if (free == null) {
            throw new Error("every imported category already has a budget");
        }
        await Effect.runPromise(
            budgetsRepo.createBudget(db, { amount: 80, categoryId: free, type: BUDGET_TYPE.month })
        );

        const counts = await Effect.runPromise(undoMoneyManagerImport(db));

        expect(counts.categories).toBe(record.categoryIds.length - 1);
        const live = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.id, free), isNull(categories.deletedAt)));
        expect(live).toHaveLength(1);
    });

    it("rolls the whole import back when a category cannot be saved", async () => {
        const db = transactionalDatabase();
        const plan = planFromFixture();
        plan.categories.unshift({
            color: "#B56858",
            existingId: null,
            icon: "Book01",
            income: false,
            key: "bad",
            name: " ",
            parent: null,
        });
        await expect(Effect.runPromise(applyMoneyManagerImport(db, plan))).rejects.toBeInstanceOf(
            MoneyManagerImportError
        );
        await expect(db.select({ id: accounts.id }).from(accounts)).resolves.toHaveLength(0);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.currency))).resolves.toBeNull();
        await expect(Effect.runPromise(readLedgerState(db))).resolves.toMatchObject({ currencyChosen: false });
    });
});

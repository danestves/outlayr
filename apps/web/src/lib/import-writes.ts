import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { firstAvailableColor } from "@outlayr/money/category-rules";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { createdAccount, nextRow } from "./account-writes";
import { categoryPush, liveCategories, newCategory } from "./category-writes";
import type { Ledger } from "./dashboard-series-ledger";
import { deletionOf } from "./delete-writes";
import { createdEntry } from "./entry-writes";
import type { CommitRow } from "./ledger-committer";

export interface PlannedEntry {
    accountId: string | null;
    amount: number;
    at: number;
    categoryId: string | null;
    currency: string;
    /** The bank's own text, kept beside the merchant name so a search for it still finds the entry. */
    details: string;
    id: string;
    income: boolean;
    note: string;
}

export interface PlannedCategory {
    id: string;
    income: boolean;
    name: string;
}

export interface PlannedAccount {
    currency: string;
    id: string;
    kind: "account" | "card";
    name: string;
}

export interface ImportPlan {
    accounts: readonly PlannedAccount[];
    categories: readonly PlannedCategory[];
    entries: readonly PlannedEntry[];
}

/** Accounts and categories go first: an entry pushed ahead of its account would land on nothing. */
export function importRows(ledger: Ledger, plan: ImportPlan, at: number): CommitRow[] {
    const accounts = plan.accounts.map((account) =>
        createdAccount(
            ledger.books,
            {
                creditLimit: null,
                currency: account.currency,
                customColor: null,
                emoji: null,
                icon: null,
                imageColor: null,
                imageKey: null,
                kind: account.kind === "card" ? "liability" : "asset",
                name: account.name.trim(),
                paymentDay: null,
                statementDay: null,
            },
            0,
            account.id,
            at
        )
    );
    const rows = [...ledger.books.categories];
    const categories: CommitRow[] = [];
    for (const planned of plan.categories) {
        const used = new Set(liveCategories(rows).flatMap((row) => (row.color === null ? [] : [row.color])));
        const made = newCategory(
            rows,
            {
                color: firstAvailableColor(used),
                emoji: null,
                icon: null,
                income: planned.income,
                name: planned.name,
                parentId: null,
                preset: null,
            },
            planned.id,
            at
        );
        rows.push(made);
        const push = categoryPush(made);
        if (push.table === "categories") {
            categories.push(push);
        }
    }
    const entries = plan.entries.flatMap((entry) =>
        createdEntry(
            ledger,
            entry.id,
            {
                accountId: entry.accountId,
                amount: entry.amount,
                categoryId: entry.categoryId,
                currency: entry.currency,
                date: entry.at,
                details: entry.details === entry.note ? "" : entry.details,
                fee: null,
                feeNote: "",
                income: entry.income,
                note: entry.note,
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: RECURRING_TYPE.none,
            },
            at
        )
    );
    return [...accounts, ...categories, ...entries];
}

export interface ImportedIds {
    accountIds: readonly string[];
    budgetIds?: readonly string[];
    categoryIds: readonly string[];
    entryIds: readonly string[];
    transferIds?: readonly string[];
}

const alive = <Row extends { deletedAt: number | null }>(rows: readonly Row[]) =>
    rows.filter((row) => row.deletedAt === null);

/**
 * Takes back what the import added and nothing since: an account or category it made stays while anything that
 * outlives the undo still points at it.
 */
export function undoRows(books: LedgerBooks, imported: ImportedIds, at: number) {
    const own = new Set(imported.entryIds);
    const ownTransfers = new Set(imported.transferIds);
    const ownBudgets = new Set(imported.budgetIds);
    const live = alive(books.transactions);
    const deletion = deletionOf(
        books,
        live.filter((row) => own.has(row.localId)).map((row) => row.localId),
        at
    );
    const others = live.filter((row) => !own.has(row.localId));
    const usedAccounts = new Set([
        ...others.map((row) => row.accountId),
        ...alive(books.transfers).flatMap((row) =>
            ownTransfers.has(row.localId) ? [] : [row.fromAccountId, row.toAccountId]
        ),
        ...alive(books.installmentPlans).map((row) => row.accountId),
        ...alive(books.outsideMoves).map((row) => row.accountId),
        ...alive(books.savingsGoals).map((row) => row.accountId),
    ]);
    const usedCategories = new Set([
        ...others.map((row) => row.categoryId),
        ...alive(books.budgets)
            .filter((row) => !ownBudgets.has(row.localId))
            .map((row) => row.categoryId),
        ...alive(books.categories)
            .filter((row) => !imported.categoryIds.includes(row.localId))
            .map((row) => row.parentId),
    ]);
    // A kept category keeps its parents, even when they came in with the import too.
    const parentOf = new Map(alive(books.categories).map((row) => [row.localId, row.parentId]));
    for (const id of usedCategories) {
        let parent = id ? parentOf.get(id) : null;
        while (parent && !usedCategories.has(parent)) {
            usedCategories.add(parent);
            parent = parentOf.get(parent);
        }
    }
    const categories = alive(books.categories)
        .filter((row) => imported.categoryIds.includes(row.localId) && !usedCategories.has(row.localId))
        .flatMap((row) => {
            const push = categoryPush({ ...row, deletedAt: at, updatedAt: at });
            return push.table === "categories" ? [push] : [];
        });
    const accounts = alive(books.accounts)
        .filter((row) => imported.accountIds.includes(row.localId) && !usedAccounts.has(row.localId))
        .map((row) => nextRow("accounts", row, { deletedAt: at }, at));
    return { count: deletion.count, rows: [...deletion.rows, ...categories, ...accounts] };
}

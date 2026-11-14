import { toAccountKind } from "@outlayr/money/account-kind";
import { startOfPeriod, BUDGET_TYPE } from "@outlayr/money/budget-window";
import { TOMBSTONED_BUDGET } from "@outlayr/money/erase";
import type { MmImportPlan } from "@outlayr/money/money-manager/types";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { createdAccount, frozenUsd, nextRow } from "@/lib/account-writes";
import { categoryPush, liveCategories, newCategory } from "@/lib/category-writes";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { deletionOf } from "@/lib/delete-writes";
import { createdEntry } from "@/lib/entry-writes";
import { undoRows } from "@/lib/import-writes";
import type { CommitRow } from "@/lib/ledger-committer";
import { createdTransfer } from "@/lib/transfer-create";

/** Everything one import added, so Undo removes exactly that and nothing logged since. */
export interface MoneyManagerImported {
    accountIds: readonly string[];
    /** Planned account key to the ledger account id, created or existing. */
    accountKeys: Readonly<Record<string, string>>;
    budgetIds: readonly string[];
    categoryIds: readonly string[];
    entryIds: readonly string[];
    /** Money Manager's balance per ledger account id, for the check that follows. */
    expectedBalances: Readonly<Record<string, number>>;
    renamedCategories: readonly { id: string; imported: string; previous: string }[];
    transferIds: readonly string[];
}

const newId = () => crypto.randomUUID();

function accountRows(ledger: Ledger, plan: MmImportPlan, at: number) {
    const { books } = ledger;
    const keys: Record<string, string> = {};
    const expected: Record<string, number> = {};
    const created: string[] = [];
    const rows: CommitRow[] = [];
    let order = Math.max(-1, ...books.accounts.filter((row) => row.deletedAt === null).map((row) => row.sortOrder));
    for (const account of plan.accounts) {
        const id = account.existingId ?? newId();
        keys[account.key] = id;
        if (account.expectedBalance !== null) {
            expected[id] = account.expectedBalance;
        }
        if (account.existingId !== null) {
            continue;
        }
        created.push(id);
        order += 1;
        const opened = account.initialBalanceDate.getTime();
        const base = createdAccount(
            books,
            {
                creditLimit: null,
                currency: account.currency,
                customColor: account.color,
                emoji: null,
                icon: account.icon,
                imageColor: null,
                imageKey: null,
                kind: "asset",
                name: account.name,
                paymentDay: null,
                statementDay: null,
            },
            account.initialBalance,
            id,
            at
        );
        rows.push(
            nextRow(
                "accounts",
                { deletedAt: null, localId: id, updatedAt: 0 },
                {
                    ...base.fields,
                    initialBalanceDate: opened,
                    initialBalanceUsd: frozenUsd(books, account.initialBalance, account.currency, opened),
                    kind: toAccountKind(account.kind),
                    sortOrder: order,
                },
                at
            )
        );
    }
    return { created, expected, keys, rows };
}

function categoryRows(ledger: Ledger, plan: MmImportPlan, at: number) {
    const keys = new Map<string, string>();
    const created: string[] = [];
    const renamed: { id: string; imported: string; previous: string }[] = [];
    const rows: CommitRow[] = [];
    let books = ledger.books.categories;
    for (const planned of plan.categories) {
        if (planned.existingId === null) {
            continue;
        }
        keys.set(planned.key, planned.existingId);
        const row = books.find((candidate) => candidate.localId === planned.existingId);
        if (row && planned.renamesExisting === true) {
            renamed.push({ id: row.localId, imported: planned.name, previous: row.name ?? "" });
            const next = { ...row, customName: true, name: planned.name, updatedAt: Math.max(at, row.updatedAt + 1) };
            books = books.map((candidate) => (candidate.localId === row.localId ? next : candidate));
            const push = categoryPush(next);
            if (push.table === "categories") {
                rows.push(push);
            }
        }
    }
    for (const planned of plan.categories) {
        if (planned.existingId !== null) {
            continue;
        }
        const id = newId();
        let parentId: string | null = null;
        if (planned.parent !== null) {
            parentId = "key" in planned.parent ? (keys.get(planned.parent.key) ?? null) : planned.parent.categoryId;
        }
        const made = newCategory(
            books,
            {
                color: planned.color,
                emoji: null,
                icon: planned.icon,
                income: planned.income,
                name: planned.name,
                parentId,
                preset: planned.preset ?? null,
            },
            id,
            at
        );
        books = [...books, made];
        keys.set(planned.key, id);
        created.push(id);
        const push = categoryPush(made);
        if (push.table === "categories") {
            rows.push(push);
        }
    }
    return { created, keys, renamed, rows };
}

/** Accounts and categories go first: a row pushed ahead of the one it points at would land on nothing. */
export function moneyManagerRows(ledger: Ledger, plan: MmImportPlan, at: number) {
    const accounts = accountRows(ledger, plan, at);
    const categories = categoryRows(ledger, plan, at);
    const budgetIds: string[] = [];
    const budgets = plan.budgets.flatMap((budget) => {
        const categoryId = categories.keys.get(budget.categoryKey);
        if (categoryId === undefined) {
            return [];
        }
        const id = newId();
        budgetIds.push(id);
        const start = startOfPeriod(new Date(at), BUDGET_TYPE.month, {
            firstDayOfMonth: ledger.firstDayOfMonth,
            firstWeekday: ledger.firstWeekday,
        });
        return [
            nextRow(
                "budgets",
                { deletedAt: null, localId: id, updatedAt: 0 },
                {
                    amount: budget.amount,
                    amountUsd: frozenUsd(ledger.books, budget.amount, ledger.currency, start.getTime()),
                    categoryId,
                    currency: ledger.currency,
                    dateCreated: at,
                    green: false,
                    name: null,
                    rollover: false,
                    startDate: start.getTime(),
                    type: BUDGET_TYPE.month,
                },
                at
            ),
        ];
    });
    const transferIds: string[] = [];
    const transfers = plan.transfers.flatMap((transfer) => {
        const fromAccountId = accounts.keys[transfer.fromAccountKey];
        const toAccountId = accounts.keys[transfer.toAccountKey];
        if (fromAccountId === undefined || toAccountId === undefined) {
            return [];
        }
        const id = newId();
        transferIds.push(id);
        const crossed = transfer.fromCurrency !== transfer.toCurrency;
        return createdTransfer(
            ledger,
            id,
            {
                date: transfer.date,
                exchangeRate: crossed ? transfer.toAmount / transfer.fromAmount : 1,
                exchangeRateType: crossed ? "custom" : null,
                fees: {},
                fromAccountId,
                fromAmount: transfer.fromAmount,
                fromCurrency: transfer.fromCurrency,
                note: transfer.note,
                toAccountId,
                toAmount: transfer.toAmount,
                toCurrency: transfer.toCurrency,
            },
            at
        );
    });
    const entryIds: string[] = [];
    const entries = plan.entries.flatMap((entry) => {
        const accountId = entry.accountKey === null ? null : (accounts.keys[entry.accountKey] ?? null);
        const categoryId = entry.categoryKey === null ? null : (categories.keys.get(entry.categoryKey) ?? null);
        if ((entry.accountKey !== null && accountId === null) || (entry.categoryKey !== null && categoryId === null)) {
            return [];
        }
        const id = newId();
        entryIds.push(id);
        return createdEntry(
            ledger,
            id,
            {
                accountId,
                amount: entry.amount,
                categoryId,
                currency: entry.currency,
                date: entry.date.getTime(),
                details: "",
                fee: null,
                feeNote: "",
                income: entry.income,
                note: entry.note,
                rate: entry.exchangeRate === null ? undefined : { custom: entry.exchangeRate, type: "custom" },
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: RECURRING_TYPE.none,
            },
            at
        );
    });
    return {
        imported: {
            accountIds: accounts.created,
            accountKeys: accounts.keys,
            budgetIds,
            categoryIds: categories.created,
            entryIds,
            expectedBalances: accounts.expected,
            renamedCategories: categories.renamed,
            transferIds,
        } satisfies MoneyManagerImported,
        rows: [...accounts.rows, ...categories.rows, ...budgets, ...transfers, ...entries],
    };
}

/** What `moneyManagerRows` added, taken back; a category or account something newer uses stays. */
export function undoMoneyManagerRows(
    ledger: Ledger,
    imported: Pick<
        MoneyManagerImported,
        "accountIds" | "budgetIds" | "categoryIds" | "entryIds" | "renamedCategories" | "transferIds"
    >,
    at: number
) {
    const { books } = ledger;
    const entries = undoRows(books, imported, at);
    const transfers = deletionOf(books, imported.transferIds, at);
    const budgets = books.budgets
        .filter((row) => row.deletedAt === null && imported.budgetIds.includes(row.localId))
        .map((row) => nextRow("budgets", row, { ...TOMBSTONED_BUDGET, deletedAt: at }, at));
    const live = liveCategories(books.categories);
    const renames = imported.renamedCategories.flatMap((renamed) => {
        const row = live.find((candidate) => candidate.localId === renamed.id && candidate.name === renamed.imported);
        if (!row) {
            return [];
        }
        const push = categoryPush({ ...row, customName: false, name: renamed.previous, updatedAt: at });
        return push.table === "categories" ? [push] : [];
    });
    return {
        count: entries.count + transfers.count,
        rows: [...transfers.rows, ...entries.rows, ...budgets, ...renames],
    };
}

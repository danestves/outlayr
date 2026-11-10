import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { decimalsFor } from "@outlayr/money/currency";
import { rateTableOf, settingsOf, zoneOf, bySeq } from "@outlayr/money/ledger-view";
import { DAY_MS, fromWall, isoDay, wall, wallMidnight } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";
import { valueDatedRowsIn } from "@outlayr/money/valuation";

import type { LedgerBooks } from "./ledger-books";

export const UNCATEGORIZED_ID = "uncategorized";
export const UNCATEGORIZED_NAME = "Uncategorized";
export const NEUTRAL_COLOR = "#767676";

export interface LedgerRow {
    accountId: string | null;
    amount: number;
    at: number;
    categoryId: string | null;
    day: string;
    feeFor: string | null;
    id: string;
    income: boolean;
    note: string;
    original: number;
    parentId: string | null;
    topId: string;
}

export interface LedgerTransfer {
    amount: number;
    arrived: number;
    arrivedCurrency: string;
    at: number;
    day: string;
    fromId: string;
    id: string;
    sent: number;
    sentCurrency: string;
    toId: string;
}

export interface LedgerCategory {
    color: string;
    id: string;
    name: string;
}

export interface BudgetTarget extends LedgerCategory {
    topId: string;
}

interface Expense extends ExpenseContribution {
    day: string;
}

export interface Ledger {
    accounts: ReadonlyMap<string, { currency: string; name: string }>;
    books: LedgerBooks;
    budgetTargets: ReadonlyMap<string, BudgetTarget>;
    categories: ReadonlyMap<string, LedgerCategory>;
    currency: string;
    expensesByCategory: ReadonlyMap<string, readonly Expense[]>;
    firstDayOfMonth: number;
    firstWeekday: number;
    now: number;
    offsetAt: (instant: number) => number;
    rates: ReturnType<typeof rateTableOf>;
    rows: readonly LedgerRow[];
    today: string;
    transfers: readonly LedgerTransfer[];
}

/** Live and not archived, in the user's order: the accounts that count toward net worth and fill pickers. */
export const openAccounts = (books: Pick<LedgerBooks, "accounts">) =>
    books.accounts
        .filter((row) => row.deletedAt === null && (row.archivedAt ?? null) === null)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);

export const startOfDay = (ledger: Pick<Ledger, "offsetAt">, day: string) =>
    fromWall(wallMidnight(day), ledger.offsetAt);

export const endOfDay = (ledger: Pick<Ledger, "offsetAt">, day: string) =>
    fromWall(wallMidnight(day) + DAY_MS, ledger.offsetAt) - 1;

export function prepareLedger(books: LedgerBooks, now: number): Ledger {
    const settings = settingsOf(books.appMeta);
    const { currency } = settings;
    const offsetAt = zoneOf(settings.timeZone, books.transactions, now);
    const rates = rateTableOf(books.exchangeRates);
    const happened = books.transactions.filter((row) => row.deletedAt === null && row.date <= now).toSorted(bySeq);
    const values = valueDatedRowsIn(
        happened.map((row) => ({ ...row, date: new Date(row.date) })),
        currency,
        rates
    );
    const filed = new Map(books.categories.filter((row) => row.deletedAt === null).map((row) => [row.localId, row]));
    const categories = new Map<string, LedgerCategory>([
        [UNCATEGORIZED_ID, { color: NEUTRAL_COLOR, id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME }],
    ]);
    const rows = happened.map((row, index): LedgerRow => {
        const category = row.categoryId ? filed.get(row.categoryId) : undefined;
        const top = category?.parentId ? filed.get(category.parentId) : category;
        if (top && !categories.has(top.localId)) {
            categories.set(top.localId, {
                color: top.color ?? NEUTRAL_COLOR,
                id: top.localId,
                name: top.name ?? UNCATEGORIZED_NAME,
            });
        }
        return {
            accountId: row.accountId ?? null,
            amount: values[index] ?? 0,
            at: row.date,
            categoryId: row.categoryId,
            day: isoDay(row.date, offsetAt(row.date)),
            feeFor: row.feeForId ?? row.transferId ?? null,
            id: row.localId,
            income: row.income,
            note: row.note,
            original: row.amount,
            parentId: category?.parentId ?? null,
            topId: top?.localId ?? UNCATEGORIZED_ID,
        };
    });
    const moved = books.transfers.filter((row) => row.deletedAt === null && row.date <= now).toSorted(bySeq);
    const movedValues = valueDatedRowsIn(
        moved.map((row) => ({
            amount: row.fromAmount,
            amountUsd: row.fromAmountUsd,
            currency: row.fromCurrency,
            date: new Date(row.date),
        })),
        currency,
        rates
    );
    const transfers = moved.map((row, index): LedgerTransfer => ({
        amount: movedValues[index] ?? 0,
        arrived: row.toAmount,
        arrivedCurrency: row.toCurrency,
        at: row.date,
        day: isoDay(row.date, offsetAt(row.date)),
        fromId: row.fromAccountId,
        id: row.localId,
        sent: row.fromAmount,
        sentCurrency: row.fromCurrency,
        toId: row.toAccountId,
    }));
    const budgetTargets = new Map<string, BudgetTarget>();
    for (const budget of books.budgets) {
        const row = budget.deletedAt === null && budget.categoryId !== null ? filed.get(budget.categoryId) : undefined;
        if (!row) {
            continue;
        }
        const parent = row.parentId === null ? undefined : filed.get(row.parentId);
        const top = parent ?? row;
        const topCategory = {
            color: top.color ?? NEUTRAL_COLOR,
            id: top.localId,
            name: top.name ?? UNCATEGORIZED_NAME,
        };
        const orphaned = row.parentId !== null && !parent;
        if (!orphaned && !categories.has(top.localId)) {
            categories.set(top.localId, topCategory);
        }
        budgetTargets.set(row.localId, {
            color: row.color ?? topCategory.color,
            id: row.localId,
            name: row.name ?? UNCATEGORIZED_NAME,
            topId: orphaned ? UNCATEGORIZED_ID : top.localId,
        });
    }
    const expensesByCategory = new Map<string, Expense[]>();
    for (const row of rows) {
        if (row.income) {
            continue;
        }
        const expense: Expense = {
            amount: row.amount,
            categoryId: row.categoryId,
            date: wall(row.at, offsetAt(row.at)),
            day: row.day,
            parentId: row.parentId,
        };
        for (const id of new Set([row.categoryId, row.parentId])) {
            if (id !== null) {
                const same = expensesByCategory.get(id);
                if (same) {
                    same.push(expense);
                } else {
                    expensesByCategory.set(id, [expense]);
                }
            }
        }
    }
    return {
        accounts: new Map(books.accounts.map((row) => [row.localId, { currency: row.currency, name: row.name }])),
        books,
        budgetTargets,
        categories,
        currency,
        expensesByCategory,
        firstDayOfMonth: settings.firstDayOfMonth,
        firstWeekday: settings.firstWeekday,
        now,
        offsetAt,
        rates,
        rows,
        today: isoDay(now, offsetAt(now)),
        transfers,
    };
}

export interface Scope {
    accounts: readonly string[];
}

export const inScope = (scope: Scope) => {
    const chosen = new Set(scope.accounts);
    return (row: LedgerRow) => chosen.size === 0 || (row.accountId !== null && chosen.has(row.accountId));
};

const rowsMemo = new WeakMap<Ledger, Map<string, readonly LedgerRow[]>>();

export const rowsOf = (ledger: Ledger, scope: Scope, income: boolean): readonly LedgerRow[] => {
    const memo = rowsMemo.get(ledger) ?? new Map<string, readonly LedgerRow[]>();
    rowsMemo.set(ledger, memo);
    const key = `${income}|${scope.accounts.join(",")}`;
    const kept = memo.get(key);
    if (kept) {
        return kept;
    }
    const wanted = inScope(scope);
    const rows = ledger.rows.filter((row) => row.income === income && wanted(row));
    memo.set(key, rows);
    return rows;
};

export const rowsBetween = (ledger: Ledger, scope: Scope, from: string, to: string, income: boolean) =>
    rowsOf(ledger, scope, income).filter((row) => row.day >= from && row.day <= to);

export const round = (ledger: Pick<Ledger, "currency">, value: number) =>
    roundMoney(value, decimalsFor(ledger.currency));

export const total = (ledger: Pick<Ledger, "currency">, rows: readonly Pick<LedgerRow, "amount">[]) =>
    round(
        ledger,
        rows.reduce((sum, row) => sum + row.amount, 0)
    );

import { rateTableOf, settingsOf, zoneOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { bySeq, fromWall, localDate, wall, DAY_MS } from "@outlayr/backend/confect/mcpLedger";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { valueDatedRowsIn } from "@outlayr/money/valuation";

export const UNCATEGORIZED_ID = "uncategorized";
export const UNCATEGORIZED_NAME = "Uncategorized";
export const NEUTRAL_COLOR = "#767676";

export interface LedgerRow {
    accountId: string | null;
    amount: number;
    at: number;
    categoryId: string | null;
    day: string;
    id: string;
    income: boolean;
    note: string;
    parentId: string | null;
    topId: string;
}

export interface LedgerCategory {
    color: string;
    id: string;
    name: string;
}

export interface Expense extends ExpenseContribution {
    day: string;
}

export interface Ledger {
    accounts: ReadonlyMap<string, { currency: string; name: string }>;
    books: LedgerBooks;
    categories: ReadonlyMap<string, LedgerCategory>;
    currency: string;
    expensesByCategory: ReadonlyMap<string, readonly Expense[]>;
    firstDayOfMonth: number;
    now: number;
    offsetAt: (instant: number) => number;
    rates: ReturnType<typeof rateTableOf>;
    rows: readonly LedgerRow[];
    today: string;
}

export const startOfDay = (ledger: Pick<Ledger, "offsetAt">, day: string) =>
    fromWall(Date.parse(`${day}T00:00:00Z`), ledger.offsetAt);

export const endOfDay = (ledger: Pick<Ledger, "offsetAt">, day: string) =>
    fromWall(Date.parse(`${day}T00:00:00Z`) + DAY_MS, ledger.offsetAt) - 1;

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
            day: localDate(row.date, offsetAt(row.date)),
            id: row.localId,
            income: row.income,
            note: row.note,
            parentId: category?.parentId ?? null,
            topId: top?.localId ?? UNCATEGORIZED_ID,
        };
    });
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
        categories,
        currency,
        expensesByCategory,
        firstDayOfMonth: settings.firstDayOfMonth,
        now,
        offsetAt,
        rates,
        rows,
        today: localDate(now, offsetAt(now)),
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

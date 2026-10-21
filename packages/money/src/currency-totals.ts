import { utcDateString } from "./dates";
import { isTransactionRateNeeded } from "./rates";
import { convertUsdSum } from "./valuation";
import type { RateTable } from "./valuation";

export interface CurrencyBucket {
    /** Signed: income adds, expense subtracts. */
    amount: number;
    currencyCode: string;
    transactionCount: number;
}

/** Mirrors Swift's `CurrencyTotals.dominanceOrder`. */
function dominanceOrder(counts: Map<string, number>, globalCurrency: string): string[] {
    return [...counts.keys()].sort((lhs, rhs) => {
        const byCount = (counts.get(rhs) ?? 0) - (counts.get(lhs) ?? 0);
        if (byCount !== 0) {
            return byCount;
        }
        if ((lhs === globalCurrency) !== (rhs === globalCurrency)) {
            return lhs === globalCurrency ? -1 : 1;
        }
        return lhs.localeCompare(rhs);
    });
}

export interface CurrencyEntry {
    amount: number;
    amountUsd?: number | null;
    /** Null: written in the ledger's currency of that day, not necessarily today's, so only `amountUsd` places it. */
    currency?: string | null;
    /** The transaction's own instant, not its local midnight: the instant the USD value was frozen against. */
    date?: Date;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
    income: boolean;
}

// Converted per (currency, UTC day, direction) cell, never per row: the Log header aggregates in SQL and the day
// sections in JS, and only a shape both produce rounds them to the same cents.
export interface CurrencyCell {
    /** Unsigned. */
    amount: number;
    /** Unsigned; zero if none were canonical. */
    amountUsd: number;
    count: number;
    /** Null is NOT the global currency: only the frozen USD value can place those rows. */
    currencyCode: string | null;
    /** UTC `YYYY-MM-DD`; the empty string when the rows carried no date. */
    dateKey: string;
    income: boolean;
    rateNeededAmount?: number;
    rateNeededCount?: number;
    unconvertedAmount: number;
    unconvertedCount: number;
}

export function toCells(entries: readonly CurrencyEntry[]): CurrencyCell[] {
    const cells = new Map<string, CurrencyCell>();
    for (const entry of entries) {
        const currencyCode = entry.currency ?? null;
        const dateKey = entry.date ? utcDateString(entry.date.getTime()) : "";
        const key = `${currencyCode}|${dateKey}|${entry.income}`;
        let cell = cells.get(key);
        if (!cell) {
            cell = {
                amount: 0,
                amountUsd: 0,
                count: 0,
                currencyCode,
                dateKey,
                income: entry.income,
                rateNeededAmount: 0,
                rateNeededCount: 0,
                unconvertedAmount: 0,
                unconvertedCount: 0,
            };
            cells.set(key, cell);
        }
        cell.amount += entry.amount;
        cell.count += 1;
        if (entry.amountUsd == null) {
            cell.unconvertedAmount += entry.amount;
            cell.unconvertedCount += 1;
            if (isTransactionRateNeeded(entry)) {
                cell.rateNeededAmount = (cell.rateNeededAmount ?? 0) + entry.amount;
                cell.rateNeededCount = (cell.rateNeededCount ?? 0) + 1;
            }
        } else {
            cell.amountUsd += entry.amountUsd;
        }
    }
    return [...cells.values()];
}

/** A cell's global-currency magnitude, excluding any unresolved foreign amount. */
export function valueCell(cell: CurrencyCell, globalCurrency: string, rates?: RateTable): number {
    if (cell.currencyCode === globalCurrency) {
        return cell.amount;
    }
    if (globalCurrency === "USD") {
        return cell.amountUsd;
    }
    if (!rates) {
        return 0;
    }
    return convertUsdSum(cell.amountUsd, cell.dateKey, globalCurrency, rates) ?? 0;
}

export interface CurrencyFigures {
    count: number;
    currencyCode: string;
    expense: number;
    income: number;
}

// Dominant first. A cell that cannot convert keeps its own currency's bucket, and an empty set yields one zero
// bucket in the global currency.
export function cellFigures(
    cells: readonly CurrencyCell[],
    globalCurrency: string,
    rates?: RateTable
): CurrencyFigures[] {
    const income = new Map<string, number>();
    const expense = new Map<string, number>();
    const counts = new Map<string, number>();

    const add = (code: string, magnitude: number, isIncome: boolean, n: number) => {
        const side = isIncome ? income : expense;
        side.set(code, (side.get(code) ?? 0) + magnitude);
        counts.set(code, (counts.get(code) ?? 0) + n);
    };

    for (const cell of cells) {
        // Only a cell that NAMES the global currency is already in it; a null one converts like any other.
        if (cell.currencyCode === globalCurrency) {
            add(globalCurrency, cell.amount, cell.income, cell.count);
            continue;
        }
        const converted =
            rates && cell.unconvertedCount < cell.count
                ? convertUsdSum(cell.amountUsd, cell.dateKey, globalCurrency, rates)
                : null;
        if (converted === null) {
            add(cell.currencyCode ?? globalCurrency, cell.amount, cell.income, cell.count);
            continue;
        }
        add(globalCurrency, converted, cell.income, cell.count - cell.unconvertedCount);
        if (cell.unconvertedCount > 0) {
            add(cell.currencyCode ?? globalCurrency, cell.unconvertedAmount, cell.income, cell.unconvertedCount);
        }
    }

    if (counts.size === 0) {
        return [{ count: 0, currencyCode: globalCurrency, expense: 0, income: 0 }];
    }

    return dominanceOrder(counts, globalCurrency).map((code) => ({
        count: counts.get(code) ?? 0,
        currencyCode: code,
        expense: expense.get(code) ?? 0,
        income: income.get(code) ?? 0,
    }));
}

export function cellTotals(
    cells: readonly CurrencyCell[],
    globalCurrency: string,
    rates?: RateTable
): CurrencyBucket[] {
    return cellFigures(cells, globalCurrency, rates).map((figures) => ({
        amount: figures.income - figures.expense,
        currencyCode: figures.currencyCode,
        transactionCount: figures.count,
    }));
}

export function currencyTotals(
    entries: readonly CurrencyEntry[],
    globalCurrency: string,
    rates?: RateTable
): CurrencyBucket[] {
    return cellTotals(toCells(entries), globalCurrency, rates);
}

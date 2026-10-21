import { decimalsFor } from "./currency";
import { utcDateString } from "./dates";
import { isTransactionRateNeeded } from "./rates";
import { convertFromUsd, roundMoney } from "./round";

export interface Valuable {
    amount: number;
    /** Frozen at write; null when no rate was available then. */
    amountUsd: number | null;
    /** Null: written in the ledger's currency of that day, not necessarily today's, so only `amountUsd` values it. */
    currency: string | null;
    /** UTC `YYYY-MM-DD` of the day the money moved. */
    dateKey: string;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
}

/** USD→currency rates; `get` answers with the newest rate on or before `dateKey`. */
export interface RateTable {
    /**
     * Every pull wipe-replaces the table with a bounded window, so a day before this floor will never be valued.
     * A code with no floor at all is merely not valued yet.
     */
    earliest: (code: string) => string | null;
    get: (code: string, dateKey: string) => number | null;
}

export function buildRateTable(rows: readonly { quote: string; date: string; rate: number }[]): RateTable {
    const byCode = new Map<string, { date: string; rate: number }[]>();
    for (const row of rows) {
        const list = byCode.get(row.quote);
        if (list) {
            list.push({ date: row.date, rate: row.rate });
        } else {
            byCode.set(row.quote, [{ date: row.date, rate: row.rate }]);
        }
    }
    for (const list of byCode.values()) {
        list.sort((a, b) => b.date.localeCompare(a.date));
    }

    return {
        earliest(code) {
            const list = byCode.get(code);
            return list?.at(-1)?.date ?? null;
        },
        get(code, dateKey) {
            const list = byCode.get(code);
            if (!list) {
                return null;
            }
            for (const entry of list) {
                if (entry.date <= dateKey) {
                    return entry.rate;
                }
            }
            return null;
        },
    };
}

// The display currency returns untouched, never through USD, or a one-currency ledger drifts by a cent. Anything
// else converts the frozen `amountUsd` at its own day's rate. A null currency converts: the ledger's can change.
export function valueExactIn(row: Valuable, displayCurrency: string, rates: RateTable): number | null {
    if (row.currency === displayCurrency) {
        return row.amount;
    }
    const amountUsd = canonicalOf(row);
    if (amountUsd === null) {
        return null;
    }
    if (displayCurrency === "USD") {
        return amountUsd;
    }
    const rate = rates.get(displayCurrency, row.dateKey);
    if (rate === null) {
        return null;
    }
    return convertFromUsd(amountUsd, rate, displayCurrency);
}

function canonicalOf(row: Valuable): number | null {
    return row.currency === "USD" ? row.amount : row.amountUsd;
}

/** {@link valueExactIn}, with face-value fallback except for pending custom rates. */
export function valueIn(row: Valuable, displayCurrency: string, rates: RateTable): number {
    if (row.currency === displayCurrency) {
        return row.amount;
    }
    if (isTransactionRateNeeded(row)) {
        return 0;
    }
    return valueExactIn(row, displayCurrency, rates) ?? row.amount;
}

export interface DirectedValuable extends Valuable {
    income?: boolean;
}

// Rows sharing a currency, UTC day and direction convert as one sum, like the Log's SQL cells, so totals match its
// header; per-row rounding drifts without bound. Each row gets its share as running differences, positionally.
export function valueRowsIn(rows: readonly DirectedValuable[], displayCurrency: string, rates: RateTable): number[] {
    const values: number[] = Array.from({ length: rows.length });
    const cells = new Map<string, { index: number; row: DirectedValuable }[]>();

    for (const [index, row] of rows.entries()) {
        // USD never rounds, so per row is already per cell; the other two cannot convert at all.
        if (displayCurrency === "USD" || row.currency === displayCurrency || canonicalOf(row) === null) {
            values[index] = valueIn(row, displayCurrency, rates);
            continue;
        }
        const key = `${row.currency}|${row.dateKey}|${row.income ?? false}`;
        const cell = cells.get(key);
        if (cell) {
            cell.push({ index, row });
        } else {
            cells.set(key, [{ index, row }]);
        }
    }

    // `convertUsdSum` rounds at the display currency's exponent, so the running difference must use the same one.
    const decimals = decimalsFor(displayCurrency);

    for (const members of cells.values()) {
        let runningUsd = 0;
        let assigned = 0;
        for (const { index, row } of members) {
            // SAFETY: rows `canonicalOf` answered null for were partitioned out before this loop.
            runningUsd += canonicalOf(row) as number;
            const converted = convertUsdSum(runningUsd, row.dateKey, displayCurrency, rates);
            if (converted === null) {
                // One dateKey per cell, so no rate for it means no rate for any of them.
                for (const other of members) {
                    values[other.index] = other.row.amount;
                }
                break;
            }
            values[index] = roundMoney(converted - assigned, decimals);
            assigned = converted;
        }
    }

    return values;
}

export interface DatedValuable {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
    date: Date;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
    income?: boolean;
}

export function valueDatedRowsIn(rows: readonly DatedValuable[], displayCurrency: string, rates: RateTable): number[] {
    return valueRowsIn(
        rows.map((row) => ({
            amount: row.amount,
            amountUsd: row.amountUsd,
            currency: row.currency,
            dateKey: utcDateString(row.date.getTime()),
            exchangeRate: row.exchangeRate,
            exchangeRateType: row.exchangeRateType,
            income: row.income,
        })),
        displayCurrency,
        rates
    );
}

export function sumValuedIn(rows: readonly DatedValuable[], displayCurrency: string, rates: RateTable): number {
    return valueDatedRowsIn(rows, displayCurrency, rates).reduce((total, value) => total + value, 0);
}

interface BudgetLimit {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
}

// Both legs at the window's opening day: the target holds still while the window is spent, and it is subtracted
// from spending valued at recent days, which a limit in years-old money would make meaningless.
export function limitIn(row: BudgetLimit, windowStart: Date, displayCurrency: string, rates: RateTable): number {
    const dateKey = utcDateString(windowStart.getTime());
    return valueIn(
        {
            amount: row.amount,
            amountUsd: limitUsdOn(row, dateKey, rates),
            currency: row.currency,
            dateKey,
        },
        displayCurrency,
        rates
    );
}

/** The stored freeze is the fallback: a stale date still beats face value. */
function limitUsdOn(row: BudgetLimit, dateKey: string, rates: RateTable): number | null {
    if (row.currency === null || row.currency === "USD") {
        return row.amountUsd;
    }
    const rate = rates.get(row.currency, dateKey);
    // A stored rate is currency-per-USD, so USD is the amount divided by it.
    return rate === null || rate <= 0 ? row.amountUsd : row.amount / rate;
}

// Convert the sum once, never row by row: per-row rounding leaves a header and its subtotals cents apart.
export function convertUsdSum(
    amountUsd: number,
    dateKey: string,
    displayCurrency: string,
    rates: RateTable
): number | null {
    if (displayCurrency === "USD") {
        return amountUsd;
    }
    const rate = rates.get(displayCurrency, dateKey);
    return rate === null ? null : convertFromUsd(amountUsd, rate, displayCurrency);
}

export function isExact(row: Valuable, displayCurrency: string, rates: RateTable): boolean {
    return valueExactIn(row, displayCurrency, rates) !== null;
}

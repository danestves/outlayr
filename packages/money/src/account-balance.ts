import { valueCell } from "./currency-totals";
import type { CurrencyCell } from "./currency-totals";
import { convertUsdSum } from "./valuation";
import type { RateTable } from "./valuation";

export interface AccountBalanceInput {
    currency: string;
    initialBalance: number;
}

export interface AccountCompositionEntry {
    /** Signed net at face value. */
    amount: number;
    currencyCode: string | null;
}

export interface AccountBalance {
    composition: AccountCompositionEntry[];
    exact: boolean;
    /** In the account's currency. */
    total: number;
}

export function cellIsExact(cell: CurrencyCell, currency: string, rates: RateTable): boolean {
    if (cell.currencyCode === currency) {
        return true;
    }
    if (cell.unconvertedCount > 0) {
        return false;
    }
    return convertUsdSum(cell.amountUsd, cell.dateKey, currency, rates) !== null;
}

export function accountBalance(
    account: AccountBalanceInput,
    cells: readonly CurrencyCell[],
    rates: RateTable
): AccountBalance {
    let total = account.initialBalance;
    let exact = true;
    const composition = new Map<string | null, number>();

    for (const cell of cells) {
        const sign = cell.income ? 1 : -1;
        total += sign * valueCell(cell, account.currency, rates);
        if (!cellIsExact(cell, account.currency, rates)) {
            exact = false;
        }
        composition.set(cell.currencyCode, (composition.get(cell.currencyCode) ?? 0) + sign * cell.amount);
    }

    return {
        composition: [...composition.entries()].map(([currencyCode, amount]) => ({
            amount,
            currencyCode,
        })),
        exact,
        total,
    };
}

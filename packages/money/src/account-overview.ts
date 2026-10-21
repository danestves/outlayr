import { accountBalance } from "./account-balance";
import type { AccountBalanceInput, AccountCompositionEntry } from "./account-balance";
import { netWorth, toAccountKind } from "./account-kind";
import type { AccountKind } from "./account-kind";
import type { CurrencyCell } from "./currency-totals";
import { utcDateString } from "./dates";
import { convertUsdSum } from "./valuation";
import type { RateTable } from "./valuation";

export function isMultiCurrency(composition: readonly AccountCompositionEntry[], accountCurrency: string): boolean {
    return composition.some((entry) => entry.currencyCode !== null && entry.currencyCode !== accountCurrency);
}

export interface OverviewAccount {
    currency: string;
    id: string;
    initialBalance: number;
    /** Absent on older rows; reads as `asset`. */
    kind?: string | null;
}

export interface OverviewRow {
    balance: number;
    exact: boolean;
    id: string;
    kind: AccountKind;
    multiCurrency: boolean;
}

export interface AccountsOverview {
    count: number;
    exact: boolean;
    /** Stated positive. */
    owe: number;
    own: number;
    total: number;
    rows: OverviewRow[];
}

export type AccountCellRow = CurrencyCell & { accountId: string | null };

// `rates` must carry each account's currency beside the display one. Null with no accounts, so the card hides.
export function accountsOverview(
    accounts: readonly OverviewAccount[],
    cells: readonly AccountCellRow[],
    displayCurrency: string,
    rates: RateTable,
    now: Date
): AccountsOverview | null {
    if (accounts.length === 0) {
        return null;
    }
    const byAccount = new Map<string, CurrencyCell[]>();
    for (const cell of cells) {
        if (cell.accountId == null) {
            continue;
        }
        const bucket = byAccount.get(cell.accountId);
        if (bucket) {
            bucket.push(cell);
        } else {
            byAccount.set(cell.accountId, [cell]);
        }
    }

    const today = utcDateString(now.getTime());
    return summarizeOverview(
        accounts.map((account) => {
            const balance = balanceIn(account, byAccount.get(account.id) ?? [], displayCurrency, rates, today);
            return {
                balance: balance.value,
                exact: balance.exact,
                id: account.id,
                kind: toAccountKind(account.kind),
                multiCurrency: isMultiCurrency(balance.composition, account.currency),
            };
        })
    );
}

export function summarizeOverview(rows: OverviewRow[]): AccountsOverview | null {
    if (rows.length === 0) {
        return null;
    }
    const worth = netWorth(rows);
    return {
        count: rows.length,
        exact: rows.every((row) => row.exact),
        owe: worth.owe,
        own: worth.own,
        rows,
        total: worth.net,
    };
}

export interface DisplayedBalance {
    exact: boolean;
    value: number;
}

// Summed in the account's currency, then restated once at `dateKey`: per-entry days would need a rate for every
// day since opening, and the app keeps about 90. `rates` must carry the account's currency too.
export function balanceIn(
    account: AccountBalanceInput,
    cells: readonly CurrencyCell[],
    displayCurrency: string,
    rates: RateTable,
    dateKey: string
): DisplayedBalance & { composition: AccountCompositionEntry[] } {
    const own = accountBalance(account, cells, rates);
    const restated = restate(own.total, account.currency, displayCurrency, dateKey, rates);
    return { composition: own.composition, exact: own.exact && restated.exact, value: restated.value };
}

// A day older than every rate reads at the oldest one, flagged inexact, so a line through it stays continuous.
export function restate(amount: number, from: string, to: string, dateKey: string, rates: RateTable): DisplayedBalance {
    if (from === to) {
        return { exact: true, value: amount };
    }
    const onDay = convertBetween(amount, from, to, dateKey, rates);
    if (onDay !== null) {
        return { exact: true, value: onDay };
    }
    let floor = dateKey;
    for (const code of [from, to]) {
        if (code === "USD") {
            continue;
        }
        const earliest = rates.earliest(code);
        if (earliest === null) {
            return { exact: false, value: 0 };
        }
        if (earliest > floor) {
            floor = earliest;
        }
    }
    return { exact: false, value: convertBetween(amount, from, to, floor, rates) ?? 0 };
}

function convertBetween(amount: number, from: string, to: string, dateKey: string, rates: RateTable): number | null {
    // A stored rate is currency per USD.
    const perUsd = from === "USD" ? 1 : rates.get(from, dateKey);
    if (perUsd === null || perUsd <= 0) {
        return null;
    }
    return convertUsdSum(amount / perUsd, dateKey, to, rates);
}

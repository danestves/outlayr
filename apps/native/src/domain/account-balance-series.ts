import { cellIsExact } from "@outlayr/money/account-balance";
import { valueCell } from "@outlayr/money/currency-totals";
import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import type { RateTable } from "@outlayr/money/valuation";

import type { PlottedCell } from "./goal-balance-series";
import { localDayKey } from "./local-day";

const HISTORY_DAYS = 182;

export interface AccountBalanceSeriesAccount {
    currency: string;
    initialBalance: number;
    initialBalanceDate: Date;
}

export interface AccountBalanceSeriesPoint {
    date: string;
    exact: boolean;
    value: number;
}

/** Through UTC, so every day is 24 hours long. */
function addDays(dateKey: string, days: number): string {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return utcDateString(date.getTime());
}

function applyCell(
    state: { exact: boolean; value: number },
    cell: CurrencyCell,
    currency: string,
    rates: RateTable
): void {
    state.value += (cell.income ? 1 : -1) * valueCell(cell, currency, rates);
    state.exact &&= cellIsExact(cell, currency, rates);
}

/**
 * One point per local day: each cell is drawn on its `plotDay` and valued at its UTC `dateKey`, as the Log does.
 * Entries from before the window become its opening value.
 */
export function accountBalanceSeries(
    account: AccountBalanceSeriesAccount,
    cells: readonly PlottedCell[],
    rates: RateTable,
    now: Date
): AccountBalanceSeriesPoint[] {
    const { currency, initialBalance: opening } = account;
    const nowKey = localDayKey(now.getTime());
    const windowStart = addDays(nowKey, -(HISTORY_DAYS - 1));
    const stampedOpening = localDayKey(account.initialBalanceDate.getTime());
    const openingDate = stampedOpening > nowKey ? nowKey : stampedOpening;
    let startDate = windowStart;
    if (account.initialBalance !== 0 && openingDate > windowStart) {
        startDate = openingDate;
    }
    const cellsByDate = new Map<string, CurrencyCell[]>();
    const state = { exact: true, value: 0 };

    if (openingDate < windowStart) {
        state.value += opening;
    }

    for (const cell of cells) {
        if (cell.plotDay < windowStart) {
            applyCell(state, cell, currency, rates);
            continue;
        }
        const onDate = cellsByDate.get(cell.plotDay);
        if (onDate) {
            onDate.push(cell);
        } else {
            cellsByDate.set(cell.plotDay, [cell]);
        }
    }

    for (let date = windowStart; date < startDate; date = addDays(date, 1)) {
        for (const cell of cellsByDate.get(date) ?? []) {
            applyCell(state, cell, currency, rates);
        }
    }

    const series: AccountBalanceSeriesPoint[] = [];
    for (let date = startDate; date <= nowKey; date = addDays(date, 1)) {
        if (date === openingDate) {
            state.value += opening;
        }
        for (const cell of cellsByDate.get(date) ?? []) {
            applyCell(state, cell, currency, rates);
        }
        series.push({ date, exact: state.exact, value: state.value });
    }
    return series;
}

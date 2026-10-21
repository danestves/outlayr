import { restate } from "@outlayr/money/account-overview";
import { utcDateString } from "@outlayr/money/dates";
import type { RateTable } from "@outlayr/money/valuation";

import { accountBalanceSeries } from "./account-balance-series";
import type { AccountBalanceSeriesAccount } from "./account-balance-series";
import type { PlottedCell } from "./goal-balance-series";
import { localDayKey } from "./local-day";

export interface NetWorthSeriesAccount extends AccountBalanceSeriesAccount {
    id: string;
}

export interface NetWorthSeriesPoint {
    date: string;
    exact: boolean;
    value: number;
}

// Sums the per-account series rather than re-deriving balances, so transfers cancel and the chart matches the accounts.
export function netWorthSeries(
    accounts: readonly NetWorthSeriesAccount[],
    cellsByAccount: ReadonlyMap<string, readonly PlottedCell[]>,
    rates: RateTable,
    now: Date,
    displayCurrency: string
): NetWorthSeriesPoint[] {
    if (accounts.length === 0) {
        return [];
    }

    // Restated at each day's rate so the last point is the accounts card's total, which values today at its UTC day.
    const today = localDayKey(now.getTime());
    const todaysRate = utcDateString(now.getTime());
    const perAccount = accounts.map((account) => {
        const series = accountBalanceSeries(account, cellsByAccount.get(account.id) ?? [], rates, now);
        return {
            byDate: new Map(
                series.map((point) => {
                    const rateDate = point.date === today ? todaysRate : point.date;
                    const restated = restate(point.value, account.currency, displayCurrency, rateDate, rates);
                    return [point.date, { exact: point.exact && restated.exact, value: restated.value }];
                })
            ),
        };
    });

    const dates = new Set<string>();
    for (const { byDate } of perAccount) {
        for (const date of byDate.keys()) {
            dates.add(date);
        }
    }

    const points: NetWorthSeriesPoint[] = [];
    const carried = perAccount.map(() => ({ exact: true, seen: false, value: 0 }));
    for (const date of [...dates].sort()) {
        let value = 0;
        let exact = true;
        for (const [index, { byDate }] of perAccount.entries()) {
            const point = byDate.get(date);
            if (point != null) {
                carried[index] = { exact: point.exact, seen: true, value: point.value };
            }
            const held = carried[index];
            if (held.seen) {
                value += held.value;
                exact &&= held.exact;
            }
        }
        points.push({ date, exact, value });
    }
    return points;
}

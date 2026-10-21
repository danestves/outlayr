import type { AccountBalanceInput } from "@outlayr/money/account-balance";
import { restate } from "@outlayr/money/account-overview";
import { valueCell } from "@outlayr/money/currency-totals";
import type { CurrencyCell } from "@outlayr/money/currency-totals";
import type { RateTable } from "@outlayr/money/valuation";

export type PlottedCell = CurrencyCell & { plotDay: string };

export interface GoalBalancePoint {
    time: number;
    value: number;
}

// Not `accountBalanceSeries`, which walks only the last 182 days; a goal's span can start earlier.
export function goalBalanceSeries(
    cells: readonly PlottedCell[],
    account: AccountBalanceInput,
    displayCurrency: string,
    rates: RateTable,
    sinceMs: number
): GoalBalancePoint[] {
    const byDay = new Map<string, number>();
    for (const cell of cells) {
        const net = (cell.income ? 1 : -1) * valueCell(cell, account.currency, rates);
        byDay.set(cell.plotDay, (byDay.get(cell.plotDay) ?? 0) + net);
    }

    const points: GoalBalancePoint[] = [];
    let running = account.initialBalance;
    for (const day of [...byDay.keys()].sort()) {
        running += byDay.get(day) ?? 0;
        const time = localMidnightOf(day);
        if (time >= sinceMs) {
            points.push({ time, value: restate(running, account.currency, displayCurrency, day, rates).value });
        }
    }
    return points;
}

function localMidnightOf(dateKey: string): number {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}

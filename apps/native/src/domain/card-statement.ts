import { valueCell } from "@outlayr/money/currency-totals";
import type { RateTable } from "@outlayr/money/valuation";

import type { PlottedCell } from "./goal-balance-series";
import { localDayKey, startOfLocalDay } from "./local-day";
import { roundToMinorUnits } from "./money";

export interface StatementDays {
    paymentDay: number;
    statementDay: number;
}

export interface StatementCycle {
    closedOn: Date;
    dueOn: Date;
    nextCloseOn: Date;
}

export interface BilledLater {
    purchasedOn: Date | null;
    rows: readonly { dueDate: Date; remaining: number }[];
}

function onDay(year: number, month: number, day: number): Date {
    const last = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, last));
}

export function statementCycle({ paymentDay, statementDay }: StatementDays, nowMs: number): StatementCycle {
    const today = new Date(nowMs);
    const thisMonth = onDay(today.getFullYear(), today.getMonth(), statementDay);
    const closedOn =
        thisMonth.getTime() < startOfLocalDay(nowMs)
            ? thisMonth
            : onDay(today.getFullYear(), today.getMonth() - 1, statementDay);
    const year = closedOn.getFullYear();
    const month = closedOn.getMonth();
    const sameMonth = onDay(year, month, paymentDay);
    return {
        closedOn,
        dueOn: sameMonth.getTime() > closedOn.getTime() ? sameMonth : onDay(year, month + 1, paymentDay),
        nextCloseOn: onDay(year, month + 1, statementDay),
    };
}

export function notYetBilled(plans: readonly BilledLater[], cycle: StatementCycle): number {
    const closeKey = localDayKey(cycle.closedOn.getTime());
    let total = 0;
    for (const { purchasedOn, rows } of plans) {
        if (purchasedOn === null || localDayKey(purchasedOn.getTime()) > closeKey) {
            continue;
        }
        for (const row of rows) {
            total += row.dueDate.getTime() > cycle.dueOn.getTime() ? row.remaining : 0;
        }
    }
    return total;
}

export function statementBalance(
    account: { currency: string; initialBalance: number },
    cells: readonly PlottedCell[],
    rates: RateTable,
    closedOn: Date,
    billedLater: number
): number {
    const closeKey = localDayKey(closedOn.getTime());
    let atClose = account.initialBalance;
    let inSince = 0;
    for (const cell of cells) {
        const value = valueCell(cell, account.currency, rates);
        if (cell.plotDay <= closeKey) {
            atClose += cell.income ? value : -value;
        } else if (cell.income) {
            inSince += value;
        }
    }
    return roundToMinorUnits(Math.max(0, -atClose - billedLater - inSince), account.currency);
}

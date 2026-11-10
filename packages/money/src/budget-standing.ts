import { effectiveLimit, rolloverCarry } from "./budget-rollover";
import { lastMsBefore } from "./budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE, windowEndMs } from "./budget-window";
import { decimalsFor } from "./currency";
import { fromWall, wall, wallDay } from "./ledger-zone";
import type { OffsetAt } from "./ledger-zone";
import { roundMoney } from "./round";
import { limitIn } from "./valuation";
import type { RateTable } from "./valuation";

const BUDGET_PERIODS = new Map<number, string>(Object.entries(BUDGET_TYPE).map(([name, code]) => [code, name]));

export interface StoredBudget {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
    dateCreated: number | null;
    rollover: boolean;
    startDate: number | null;
    type: number;
}

interface BudgetClock {
    currency: string;
    now: Date;
    offsetAt: OffsetAt;
    rates: RateTable;
}

export function budgetStanding(
    budget: StoredBudget,
    carries: boolean,
    spentThrough: (start: Date, last: Date) => number,
    clock: BudgetClock
) {
    const window = advanceBudgetWindow(
        budget.startDate === null ? clock.now : wall(budget.startDate, clock.offsetAt(budget.startDate)),
        budget.type,
        clock.now,
        true
    );
    const spent = spentThrough(window.start, new Date(windowEndMs(window, clock.now.getTime())));
    const limit = limitIn(
        budget,
        new Date(fromWall(window.start.getTime(), clock.offsetAt)),
        clock.currency,
        clock.rates
    );
    const carry = carries
        ? rolloverCarry({
              anchor:
                  budget.dateCreated === null
                      ? window.start
                      : wall(budget.dateCreated, clock.offsetAt(budget.dateCreated)),
              current: window,
              limit,
              spentIn: (start, end) => spentThrough(start, lastMsBefore(end)),
              type: budget.type,
              wall: true,
          }).credit
        : 0;
    const amount = effectiveLimit(limit, carry);
    const decimals = decimalsFor(clock.currency);
    return {
        carryOver: roundMoney(carry, decimals),
        effectiveLimit: roundMoney(amount, decimals),
        from: wallDay(window.start),
        limit: roundMoney(limit, decimals),
        overBudget: spent > amount,
        period: BUDGET_PERIODS.get(budget.type) ?? null,
        remaining: roundMoney(amount - spent, decimals),
        rollover: budget.rollover,
        spent: roundMoney(spent, decimals),
        to: wallDay(new Date(window.end.getTime() - 1)),
    };
}

import type { RateTable } from "@outlayr/money/valuation";

import { notYetBilled, statementBalance, statementCycle } from "@/domain/card-statement";
import type { StatementCycle } from "@/domain/card-statement";
import type { PlottedCell } from "@/domain/goal-balance-series";

import type { Account } from "./accounts-core";
import type { PlanWithStanding } from "./installments-core";

export interface CardStatement {
    cycle: StatementCycle;
    due: number;
}

export function cardStatement(
    account: Pick<Account, "currency" | "initialBalance" | "paymentDay" | "statementDay">,
    cells: readonly PlottedCell[],
    rates: RateTable,
    plans: readonly PlanWithStanding[],
    nowMs: number
): CardStatement | null {
    const { paymentDay, statementDay } = account;
    if (paymentDay === null || statementDay === null) {
        return null;
    }
    const cycle = statementCycle({ paymentDay, statementDay }, nowMs);
    const later = notYetBilled(
        plans
            .filter(({ plan }) => plan.currency === account.currency)
            .map(({ purchase, standing }) => ({
                purchasedOn: purchase?.date ?? null,
                rows: standing.rows.map((row) => ({ dueDate: row.row.dueDate, remaining: row.remaining })),
            })),
        cycle
    );
    return { cycle, due: statementBalance(account, cells, rates, cycle.closedOn, later) };
}

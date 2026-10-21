import { restate } from "@outlayr/money/account-overview";
import { utcDateString } from "@outlayr/money/dates";
import type { RateTable } from "@outlayr/money/valuation";

import type { InstallmentStanding } from "@/domain/installments";
import { addLocalDays } from "@/domain/local-day";
import { roundToMinorUnits } from "@/domain/money";

import { upcomingInstallments } from "./installments-core";
import type { InstallmentRow, PlanWithStanding, UpcomingInstallment } from "./installments-core";

export const DUE_WINDOW_DAYS = 14;

export interface DueWindow {
    count: number;
    exact: boolean;
    next: UpcomingInstallment;
    /** In the display currency. */
    total: number;
}

// Each cuota counts what its payments haven't covered, valued at today's rate like the Debts totals. `rates` has to
// carry each order's currency.
export function dueWindow(
    plans: readonly PlanWithStanding[],
    nowMs: number,
    displayCurrency: string,
    rates: RateTable
): DueWindow | null {
    const due = upcomingInstallments(plans, new Date(addLocalDays(nowMs, DUE_WINDOW_DAYS)));
    const [next] = due;
    if (next === undefined) {
        return null;
    }
    const dateKey = utcDateString(nowMs);
    let total = 0;
    let exact = true;
    for (const { currency, standing } of due) {
        const valued = restate(standing.remaining, currency, displayCurrency, dateKey, rates);
        total += valued.value;
        exact &&= valued.exact;
    }
    return { count: due.length, exact, next, total: roundToMinorUnits(total, displayCurrency) };
}

export interface AccountInstallments {
    next: InstallmentStanding<InstallmentRow>;
    open: PlanWithStanding[];
}

export function installmentsByAccount(plans: readonly PlanWithStanding[]): Map<string, AccountInstallments> {
    const byAccount = new Map<string, AccountInstallments>();
    for (const entry of plans) {
        const { next } = entry.standing;
        if (next === null) {
            continue;
        }
        const current = byAccount.get(entry.plan.accountId);
        if (current === undefined) {
            byAccount.set(entry.plan.accountId, { next, open: [entry] });
            continue;
        }
        current.open.push(entry);
        if (next.row.dueDate.getTime() < current.next.row.dueDate.getTime()) {
            current.next = next;
        }
    }
    return byAccount;
}

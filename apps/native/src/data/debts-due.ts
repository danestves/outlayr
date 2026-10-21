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
    /** Cuotas not fully covered and due by the window's last day, overdue ones included. */
    count: number;
    /** False when part of `total` could not be valued. */
    exact: boolean;
    /** The soonest of them. */
    next: UpcomingInstallment;
    /** What is left of them, in the display currency. */
    total: number;
}

/**
 * The cuotas due from today through `DUE_WINDOW_DAYS` ahead plus the overdue
 * ones, each counted for what its order's payments have not covered, valued
 * into `displayCurrency` at today's rate as the Debts totals are. Null when
 * nothing is due. `rates` has to carry each order's currency.
 */
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
    /** The soonest cuota not fully covered across the account's open orders. */
    next: InstallmentStanding<InstallmentRow>;
    /** The orders not yet paid off. */
    open: PlanWithStanding[];
}

/** Each liability's open orders and its soonest unpaid cuota, by account id. */
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

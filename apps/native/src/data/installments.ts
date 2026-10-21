import { useMemo } from "react";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { addLocalDays } from "@/domain/local-day";

import {
    assemblePlans,
    liveInstallmentsQuery,
    liveOutsidePaymentsQuery,
    livePlansQuery,
    planPaymentsQuery,
    planPurchasesQuery,
    upcomingInstallments,
} from "./installments-core";
import type { PlanWithStanding, UpcomingInstallment } from "./installments-core";
import { useLiveQuery } from "./live-query";

/**
 * Live orders with their derived standing, every account's or one's.
 *
 * `nowMs` is the screen's `useNow()` reading, as in `useSavingsGoals`: overdue
 * is measured against the day, and a memo keyed only on data would keep
 * yesterday's verdict on a screen left open past midnight.
 */
export function useInstallmentPlans(db: Database, nowMs: number, accountId?: string): PlanWithStanding[] {
    const plans = useLiveQuery(installmentPlans, () => livePlansQuery(db, accountId), [accountId]);
    const rows = useLiveQuery(installments, () => liveInstallmentsQuery(db));
    const payments = useLiveQuery(transfers, () => planPaymentsQuery(db));
    const outside = useLiveQuery(outsidePayments, () => liveOutsidePaymentsQuery(db));
    const purchases = useLiveQuery(transactions, () => planPurchasesQuery(db));
    return useMemo(
        () => assemblePlans({ installments: rows, outside, payments, plans, purchases }, new Date(nowMs)),
        [nowMs, outside, payments, plans, purchases, rows]
    );
}

/**
 * Installments not yet covered and due within `days` of today, soonest first,
 * across every account or one: an account's "Coming up" list passes its
 * `accountId`. Overdue ones are included.
 */
export function useUpcomingInstallments(
    db: Database,
    nowMs: number,
    window: { accountId?: string; days: number }
): UpcomingInstallment[] {
    const { accountId, days } = window;
    const plans = useInstallmentPlans(db, nowMs, accountId);
    return useMemo(() => upcomingInstallments(plans, new Date(addLocalDays(nowMs, days))), [days, nowMs, plans]);
}

import { useMemo } from "react";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { addLocalDays } from "@/domain/local-day";

import {
    assemblePlans,
    liveInstallmentsQuery,
    liveOutsidePaymentsQuery,
    livePlansQuery,
    planFeesQuery,
    planPaymentsQuery,
    planPurchasesQuery,
    upcomingInstallments,
} from "./installments-core";
import type { PlanWithStanding, UpcomingInstallment } from "./installments-core";
import { useLiveQuery } from "./live-query";

// `nowMs` is the screen's `useNow()` reading: overdue is measured against the day, and a data-keyed memo would keep
// yesterday's verdict past midnight.
export function useInstallmentPlans(db: Database, nowMs: number, accountId?: string): PlanWithStanding[] {
    const plans = useLiveQuery(installmentPlans, () => livePlansQuery(db, accountId), [accountId]);
    const rows = useLiveQuery(installments, () => liveInstallmentsQuery(db));
    const payments = useLiveQuery(transfers, () => planPaymentsQuery(db));
    const outside = useLiveQuery(outsidePayments, () => liveOutsidePaymentsQuery(db));
    const purchases = useLiveQuery(transactions, () => planPurchasesQuery(db));
    const fees = useLiveQuery(transactions, () => planFeesQuery(db));
    return useMemo(
        () => assemblePlans({ fees, installments: rows, outside, payments, plans, purchases }, new Date(nowMs)),
        [fees, nowMs, outside, payments, plans, purchases, rows]
    );
}

// Overdue installments are included.
export function useUpcomingInstallments(
    db: Database,
    nowMs: number,
    window: { accountId?: string; days: number }
): UpcomingInstallment[] {
    const { accountId, days } = window;
    const plans = useInstallmentPlans(db, nowMs, accountId);
    return useMemo(() => upcomingInstallments(plans, new Date(addLocalDays(nowMs, days))), [days, nowMs, plans]);
}

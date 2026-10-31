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
import { planGoesWithPendingDelete } from "./pending-deletes";
import { usePendingDeletes } from "./use-deferred-delete";

// `nowMs` is the screen's `useNow()` reading: overdue is measured against the day, and a result keyed on the data
// alone would keep yesterday's verdict past midnight.
export function useInstallmentPlans(db: Database, nowMs: number, accountId?: string): PlanWithStanding[] {
    const pending = usePendingDeletes();
    const all = useLiveQuery(installmentPlans, () => livePlansQuery(db, accountId), [accountId]);
    const plans = all.filter((plan) => !planGoesWithPendingDelete(plan, pending));
    const rows = useLiveQuery(installments, () => liveInstallmentsQuery(db));
    const payments = useLiveQuery(transfers, () => planPaymentsQuery(db, pending), [pending]);
    const outside = useLiveQuery(outsidePayments, () => liveOutsidePaymentsQuery(db));
    const purchases = useLiveQuery(transactions, () => planPurchasesQuery(db));
    const fees = useLiveQuery(transactions, () => planFeesQuery(db));
    return assemblePlans({ fees, installments: rows, outside, payments, plans, purchases }, new Date(nowMs));
}

// Overdue installments are included.
export function useUpcomingInstallments(
    db: Database,
    nowMs: number,
    window: { accountId?: string; days: number }
): UpcomingInstallment[] {
    const { accountId, days } = window;
    const plans = useInstallmentPlans(db, nowMs, accountId);
    return upcomingInstallments(plans, new Date(addLocalDays(nowMs, days)));
}

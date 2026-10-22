import { startOfDay } from "@outlayr/money/calendar";
import type { MarketRateType } from "@outlayr/money/rates";
import { buildRateTable } from "@outlayr/money/valuation";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { exchangeRates, installmentPlans, installments, outsidePayments } from "@/db/schema";
import type { TransferLogRow } from "@/domain/transfer-log-rows";
import { marketRateFor } from "@/domain/transfer-rate-options";

import type { Account } from "./accounts-core";
import { useLiveQuery } from "./live-query";
import { useTransferRates } from "./transfer-rates";

const OFFICIAL: readonly MarketRateType[] = ["official"];

export function usePaymentRate(db: Database, from: string, to: string, date: Date): number | null {
    const table = useTransferRates(db, [from, to], OFFICIAL).official;
    return table === undefined ? null : marketRateFor(from, to, date, table);
}

// Read once for a save: the entry form never subscribes to rates it may not need.
export function paymentRate(db: Database, from: string, to: string, date: Date): number | null {
    if (from === to) {
        return 1;
    }
    const rows = db
        .select({ date: exchangeRates.date, quote: exchangeRates.quote, rate: exchangeRates.rate })
        .from(exchangeRates)
        .where(
            and(
                inArray(
                    exchangeRates.quote,
                    [from, to].filter((code) => code !== "USD")
                ),
                eq(exchangeRates.rateType, "official")
            )
        )
        .all();
    return marketRateFor(from, to, date, buildRateTable(rows));
}

export function planIdForPurchase(db: Database, transactionId: string): string | null {
    const [plan] = db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(eq(installmentPlans.transactionId, transactionId), isNull(installmentPlans.deletedAt)))
        .limit(1)
        .all();
    return plan?.id ?? null;
}

const NO_CUOTAS: ReadonlySet<string> = new Set();

export function usePendingCuotas(db: Database, purchaseId: string | null): ReadonlySet<string> {
    return useMemo(() => {
        if (purchaseId === null) {
            return NO_CUOTAS;
        }
        const rows = db
            .select({ id: installments.id })
            .from(installments)
            .innerJoin(installmentPlans, eq(installmentPlans.id, installments.planId))
            .where(
                and(
                    eq(installmentPlans.transactionId, purchaseId),
                    isNull(installmentPlans.deletedAt),
                    isNull(installments.deletedAt)
                )
            )
            .all();
        return rows.length === 0 ? NO_CUOTAS : new Set(rows.map((row) => row.id));
    }, [db, purchaseId]);
}

function accountOutsidePaymentsQuery(db: Database, accountId: string) {
    return db
        .select({
            amount: outsidePayments.amount,
            amountUsd: outsidePayments.amountUsd,
            date: outsidePayments.date,
            id: outsidePayments.id,
            planId: outsidePayments.planId,
        })
        .from(outsidePayments)
        .innerJoin(installmentPlans, eq(installmentPlans.id, outsidePayments.planId))
        .where(
            and(
                isNull(outsidePayments.deletedAt),
                isNull(installmentPlans.deletedAt),
                eq(installmentPlans.accountId, accountId)
            )
        )
        .orderBy(desc(outsidePayments.date));
}

// Shaped as arriving transfer rows of the account's activity, with `sender` standing in for the source account.
export function useOutsidePaymentRows(
    db: Database,
    account: Pick<Account, "currency" | "id" | "name"> | null,
    sender: string
): (TransferLogRow & { planId: string })[] {
    const rows = useLiveQuery(
        outsidePayments,
        () => (account === null ? { all: () => [] } : accountOutsidePaymentsQuery(db, account.id)),
        [account?.id]
    );
    return useMemo(
        () =>
            account === null
                ? []
                : rows.map((row) => ({
                      amount: row.amount,
                      amountUsd: row.amountUsd,
                      categoryColor: null,
                      categoryEmoji: null,
                      categoryIcon: null,
                      categoryId: null,
                      categoryName: null,
                      currency: account.currency,
                      customColor: null,
                      date: row.date,
                      day: startOfDay(row.date),
                      emoji: null,
                      ends: null,
                      exchangeRate: null,
                      exchangeRateType: null,
                      excludedFromTotals: false,
                      feeForId: null,
                      icon: null,
                      id: row.id,
                      imageColor: null,
                      imageUri: null,
                      income: true,
                      installmentId: null,
                      moved: {
                          arrived: row.amount,
                          arrivedCurrency: account.currency,
                          fee: null,
                          outside: null,
                          sent: row.amount,
                      },
                      note: `${sender} → ${account.name}`,
                      planId: row.planId,
                      recurringAnchorDay: null,
                      recurringCoefficient: 1,
                      recurringEndDate: null,
                      recurringType: 0,
                      sign: "+",
                      transferId: row.id,
                  })),
        [rows, account, sender]
    );
}

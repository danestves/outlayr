import { utcDateString } from "@outlayr/money/dates";
import { and, desc, eq, gte, isNotNull, isNull, max, ne } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { cardFeeAmount, cardFeeBase } from "@/domain/card-fee";
import { paidViaMemory } from "@/domain/paid-via";
import type { PaidViaMemory } from "@/domain/paid-via";
import { translateNow } from "@/i18n/runtime";

import { getMetaSync, META_KEYS, setMeta } from "./app-meta-core";
import { getCategoryById } from "./categories-core";
import { frozenUsdAmount } from "./frozen-usd";
import { localRateLookup } from "./rates";

type Row = typeof transactions.$inferSelect;
type Insert = typeof transactions.$inferInsert;

export type CardFeeInput = { categoryId: string | null; currency: string; note: string } & (
    | { amount: number; rate: null }
    | { amount: null; rate: number }
);

interface FeePurchase {
    accountId?: string | null;
    amount: number;
    amountUsd?: number | null;
    currency?: string | null;
    date: Date;
    day: Date;
    month: Date;
}

const FEE_RATE_CHOICES = 3;

const PAID_VIA_WINDOW = 200;

const SETTLE_WINDOW_MS = 120 * 24 * 60 * 60 * 1000;

export function cardFeeFor(db: Database, purchaseId: string): Row | null {
    const rows = db
        .select()
        .from(transactions)
        .where(and(eq(transactions.feeForId, purchaseId), isNull(transactions.deletedAt)))
        .limit(1)
        .all();
    return rows[0] ?? null;
}

export function feeRatesOn(db: Database, accountId: string): number[] {
    const rows = db
        .select({ rate: transactions.feeRate })
        .from(transactions)
        .where(
            and(eq(transactions.accountId, accountId), isNotNull(transactions.feeRate), isNull(transactions.deletedAt))
        )
        .groupBy(transactions.feeRate)
        .orderBy(desc(max(transactions.date)))
        .limit(FEE_RATE_CHOICES)
        .all();
    return rows.flatMap((row) => (row.rate === null ? [] : [row.rate])).sort((a, b) => a - b);
}

export function recentPaidVia(db: Database, accountId: string): PaidViaMemory {
    const rows = db
        .select({ note: transactions.note, paidVia: transactions.paidVia })
        .from(transactions)
        .where(
            and(
                eq(transactions.accountId, accountId),
                eq(transactions.income, false),
                isNotNull(transactions.paidVia),
                isNull(transactions.deletedAt)
            )
        )
        .orderBy(desc(transactions.date))
        .limit(PAID_VIA_WINDOW)
        .all();
    return paidViaMemory(rows);
}

export function lastForeignFeeRate(db: Database, accountId: string, accountCurrency: string): number | null {
    const [purchase] = db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
            and(
                eq(transactions.accountId, accountId),
                eq(transactions.income, false),
                isNull(transactions.deletedAt),
                isNull(transactions.feeForId),
                isNull(transactions.transferId),
                isNotNull(transactions.currency),
                ne(transactions.currency, accountCurrency)
            )
        )
        .orderBy(desc(transactions.date))
        .limit(1)
        .all();
    return purchase === undefined ? null : (cardFeeFor(db, purchase.id)?.feeRate ?? null);
}

export function goesWithPendingDelete(
    row: { feeForId: string | null; id: string; installmentId: string | null; transferId: string | null },
    pendingId: string | null,
    pendingCuotas: ReadonlySet<string> = new Set()
): boolean {
    return (
        pendingId !== null &&
        ([row.id, row.feeForId, row.transferId].includes(pendingId) ||
            (row.installmentId != null && pendingCuotas.has(row.installmentId)))
    );
}

export function lastFeeCategoryId(db: Database): string | null {
    return getMetaSync(db, META_KEYS.lastTransferFeeCategory);
}

export async function rememberFeeCategory(db: Database, categoryId: string): Promise<void> {
    await setMeta(db, META_KEYS.lastTransferFeeCategory, categoryId);
}

export function feeCategoryFor(db: Database, purchaseCategoryId: string | null): string | null {
    const remembered = lastFeeCategoryId(db);
    return remembered !== null && getCategoryById(db, remembered) !== null ? remembered : purchaseCategoryId;
}

export function suggestedCardFee(
    db: Database,
    purchase: {
        account: { currency: string; id: string } | null;
        categoryId: string | null;
        currency: string | null;
        merchant: string;
    }
): CardFeeInput | null {
    const { account, currency } = purchase;
    if (account === null || currency === null || currency === account.currency) {
        return null;
    }
    const rate = lastForeignFeeRate(db, account.id, account.currency);
    return rate === null
        ? null
        : {
              amount: null,
              categoryId: feeCategoryFor(db, purchase.categoryId),
              currency: account.currency,
              note: translateNow("transaction.fee.note", {
                  merchant:
                      purchase.merchant.trim() ||
                      (purchase.categoryId === null ? "" : (getCategoryById(db, purchase.categoryId)?.name ?? "")),
              }),
              rate,
          };
}

async function percentFee(db: Database, purchase: FeePurchase, rate: number, currency: string) {
    const entry = purchase.currency ?? currency;
    const quote =
        currency === "USD" || currency === entry
            ? null
            : await localRateLookup(db)(currency, "official", utcDateString(purchase.date.getTime()));
    const cardRate = quote?.rate ?? null;
    const base = cardFeeBase(purchase.amount, { card: currency, entry }, () => purchase.amountUsd ?? null, cardRate);
    return base === null ? null : cardFeeAmount({ kind: "percent", rate }, base, currency);
}

export async function cardFeeValues(db: Database, purchaseId: string, purchase: FeePurchase, fee: CardFeeInput) {
    const charged = fee.rate === null ? fee.amount : await percentFee(db, purchase, fee.rate, fee.currency);
    return {
        accountId: purchase.accountId ?? null,
        amount: charged ?? 0,
        amountUsd: charged === null ? null : await frozenUsdAmount(db, charged, fee.currency, purchase.date),
        categoryId: fee.categoryId,
        currency: fee.currency,
        date: purchase.date,
        day: purchase.day,
        deletedAt: null,
        feeForId: purchaseId,
        feeRate: fee.rate,
        income: false,
        month: purchase.month,
        note: fee.note,
    };
}

export async function occurrenceFees(
    db: Database,
    carrierId: string,
    occurrences: readonly Insert[],
    feeId: (occurrenceId: string) => string,
    now: Date
): Promise<Insert[]> {
    const fee = cardFeeFor(db, carrierId);
    if (fee === null || fee.currency === null) {
        return [];
    }
    const shared = { categoryId: fee.categoryId, currency: fee.currency, note: fee.note };
    const input: CardFeeInput =
        fee.feeRate === null
            ? { ...shared, amount: fee.amount, rate: null }
            : { ...shared, amount: null, rate: fee.feeRate };
    return await Promise.all(
        occurrences.map(async (occurrence) => ({
            ...(await cardFeeValues(db, occurrence.id, occurrence, input)),
            id: feeId(occurrence.id),
            updatedAt: now,
        }))
    );
}

export async function settlePendingFees(db: Database, now: Date = new Date()): Promise<number> {
    const pending = db
        .select()
        .from(transactions)
        .where(
            and(
                isNotNull(transactions.feeForId),
                isNotNull(transactions.feeRate),
                eq(transactions.amount, 0),
                isNull(transactions.deletedAt),
                gte(transactions.date, new Date(now.getTime() - SETTLE_WINDOW_MS))
            )
        )
        .all();
    let settled = 0;
    /* oxlint-disable no-await-in-loop -- each fee reads its own purchase and rates; the list is the handful still waiting on a rate */
    for (const fee of pending) {
        const [purchase] =
            fee.feeForId === null
                ? []
                : db.select().from(transactions).where(eq(transactions.id, fee.feeForId)).limit(1).all();
        if (purchase === undefined || purchase.deletedAt !== null || fee.feeRate === null || fee.currency === null) {
            continue;
        }
        const values = await cardFeeValues(db, purchase.id, purchase, {
            amount: null,
            categoryId: fee.categoryId,
            currency: fee.currency,
            note: fee.note,
            rate: fee.feeRate,
        });
        if (values.amount === 0) {
            continue;
        }
        await db
            .update(transactions)
            .set({ amount: values.amount, amountUsd: values.amountUsd, updatedAt: now })
            .where(and(eq(transactions.id, fee.id), eq(transactions.updatedAt, fee.updatedAt)));
        settled += 1;
    }
    /* oxlint-enable no-await-in-loop */
    return settled;
}

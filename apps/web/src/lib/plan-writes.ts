import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { entryRow } from "@outlayr/money/entry-row";
import {
    draftSchedule,
    EVERY_OPTIONS,
    newInstallmentDraft,
    overPrice,
    paidBeforeCount,
} from "@outlayr/money/installment-draft";
import type { EveryOption } from "@outlayr/money/installment-draft";
import { generateSchedule } from "@outlayr/money/installments";
import type { ScheduledInstallment } from "@outlayr/money/installments";
import * as Effect from "effect/Effect";

import { frozenUsd, ratesLookup } from "./account-writes";
import type { CommitRow } from "./ledger-committer";

export interface PurchaseChoices {
    count: number;
    currency: string;
    /** Null while each installment is the price split evenly. */
    each: number | null;
    every: EveryOption;
    firstDue: Date | null;
    now: Date;
    price: number;
    upfront: number;
}

/**
 * The schedule the form shows and saves. An old purchase recorded late starts on its first due day, and whatever fell
 * due before today counts as already paid, as on native, so a plan does not open overdue.
 */
export function planPurchase({ count, currency, each, every, firstDue, now, price, upfront }: PurchaseChoices) {
    const backdated = firstDue !== null && firstDue < now;
    const purchaseDay = backdated ? firstDue : now;
    const draft = { ...newInstallmentDraft(null), count, each, every, firstDue, upfront: { amount: upfront } };
    const schedule = price > 0 ? draftSchedule(draft, price, purchaseDay, currency) : null;
    const installments = schedule?.filter((row) => row.sequence > 0) ?? [];
    const paidBefore = schedule ? paidBeforeCount(draft, schedule, now) : 0;
    const settled = installments.slice(0, paidBefore).reduce((sum, row) => sum + row.amount, 0);
    const [fallback] = generateSchedule({
        amount: { each: 1 },
        count: 1,
        currency,
        firstDue: firstDue ?? undefined,
        interval: EVERY_OPTIONS[every],
        purchaseDay,
    });
    return {
        ahead: installments.slice(paidBefore),
        backdated,
        firstDue: installments[0]?.dueDate ?? fallback?.dueDate ?? now,
        over: schedule ? overPrice(schedule, price, currency) : 0,
        paidBefore,
        paidNow: upfront + settled,
        schedule,
        split: each === null ? (installments[0]?.amount ?? null) : null,
        total: schedule?.reduce((sum, row) => sum + row.amount, 0) ?? 0,
        // A typed amount that overshoots already reads as over the price.
        upfrontTooHigh: price > 0 && schedule === null && each === null,
    };
}

export interface PurchaseDraft {
    accountId: string;
    categoryId: string | null;
    categoryName: string | null;
    currency: string;
    name: string;
    /** Installments 1..k already settled before this was recorded. */
    paidBefore: number;
    price: number;
    purchasedAt: number;
    /** `dueDate` is the start of the due day in the ledger's zone. */
    schedule: readonly ScheduledInstallment[];
}

/**
 * The rows native's `createOrder` writes when the upfront comes from outside: the charge, the plan, its schedule, and
 * an outside payment for the upfront and each installment already settled. Nothing leaves another account.
 */
export function purchaseInInstallments(
    books: Pick<LedgerBooks, "exchangeRates">,
    draft: PurchaseDraft,
    newId: () => string,
    at: number
): CommitRow[] {
    const planId = newId();
    const transactionId = newId();
    const synced = { deletedAt: null, restoredAt: null, updatedAt: at };
    const date = new Date(draft.purchasedAt);
    const entry = Effect.runSync(
        entryRow(
            ratesLookup(books),
            transactionId,
            {
                accountId: draft.accountId,
                amount: draft.price,
                categoryId: draft.categoryId,
                currency: draft.currency,
                date,
                details: null,
                income: false,
                note: draft.name,
            },
            { categoryName: draft.categoryName, currency: draft.currency, now: new Date(at) }
        )
    );
    const paid = (amount: number, paidAt: number): CommitRow => ({
        ...synced,
        fields: { amount, amountUsd: frozenUsd(books, amount, draft.currency, paidAt), date: paidAt, planId },
        localId: newId(),
        table: "outsidePayments",
    });
    const installments = draft.schedule.filter((row) => row.sequence > 0).toSorted((a, b) => a.sequence - b.sequence);
    return [
        {
            ...synced,
            fields: {
                accountId: entry.accountId,
                amount: entry.amount,
                amountUsd: entry.amountUsd,
                categoryId: entry.categoryId,
                currency: entry.currency,
                customColor: null,
                date: entry.date.getTime(),
                day: entry.day.getTime(),
                details: entry.details,
                emoji: null,
                exchangeRate: entry.exchangeRate,
                exchangeRateType: entry.exchangeRateType,
                icon: null,
                imageColor: null,
                imageKey: null,
                income: false,
                month: entry.month.getTime(),
                note: entry.note,
                onceRecurring: false,
                recurringCoefficient: entry.recurringCoefficient,
                recurringEndDate: null,
                recurringType: entry.recurringType,
            },
            localId: transactionId,
            table: "transactions",
        },
        {
            ...synced,
            fields: { accountId: draft.accountId, dateCreated: at, transactionId },
            localId: planId,
            table: "installmentPlans",
        },
        ...draft.schedule.map((row): CommitRow => ({
            ...synced,
            fields: { amount: row.amount, dueDate: row.dueDate.getTime(), planId, sequence: row.sequence },
            localId: newId(),
            table: "installments",
        })),
        ...draft.schedule.filter((row) => row.sequence === 0).map((row) => paid(row.amount, draft.purchasedAt)),
        ...installments.slice(0, draft.paidBefore).map((row) => paid(row.amount, Math.min(row.dueDate.getTime(), at))),
    ];
}

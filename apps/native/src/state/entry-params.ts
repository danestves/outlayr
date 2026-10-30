import { isPickableCurrency } from "@outlayr/money/currency";
import { SELECTABLE_RECURRING_TYPES } from "@outlayr/money/recurrence";

import type { TransactionSeed } from "@/components/transaction-form";
import { encodeInstallmentSeed, parseInstallmentSeed } from "@/domain/installment-scan";
import { AMOUNT_CEILING } from "@/domain/numpad";
import { parseReceipt } from "@/domain/receipt-items";

type LinkParam = string | string[];

export interface EntryParams {
    accountId?: LinkParam;
    /** "1" when the voice draft named an account the ledger could not place. */
    accountUnresolved?: LinkParam;
    amount?: LinkParam;
    attachment?: LinkParam;
    categoryId?: LinkParam;
    currency?: LinkParam;
    /** Epoch milliseconds. */
    date?: LinkParam;
    details?: LinkParam;
    income?: LinkParam;
    installmentDraft?: LinkParam;
    installments?: LinkParam;
    note?: LinkParam;
    receipt?: LinkParam;
    recurringCoefficient?: LinkParam;
    recurringType?: LinkParam;
}

const PLAIN_DECIMAL = /^\d+(?:\.\d+)?$/;
const SCAN_ATTACHMENT = /^[\da-f-]{36}\.jpg$/i;

function single(param: LinkParam | undefined): string | undefined {
    return Array.isArray(param) ? undefined : param;
}

function plainNumber(param: LinkParam | undefined): number {
    const text = single(param) ?? "";
    return PLAIN_DECIMAL.test(text) ? Number(text) : Number.NaN;
}

export function entryHref(seed: TransactionSeed) {
    const { recurrence } = seed;
    const params = {
        accountId: seed.accountId,
        accountUnresolved: seed.accountUnresolved ? "1" : undefined,
        amount: seed.amount === undefined ? undefined : String(seed.amount),
        attachment: seed.attachment,
        categoryId: seed.categoryId,
        currency: seed.currency,
        date: seed.date === undefined ? undefined : String(seed.date.getTime()),
        details: seed.details,
        income: seed.income ? "1" : undefined,
        installmentDraft:
            seed.installmentDraft === undefined ? undefined : encodeInstallmentSeed(seed.installmentDraft),
        installments: seed.installments ? "1" : undefined,
        note: seed.note,
        receipt: seed.receipt,
        recurringCoefficient: recurrence === undefined ? undefined : String(recurrence.coefficient),
        recurringType: recurrence === undefined ? undefined : String(recurrence.type),
    } satisfies Record<keyof EntryParams, string | undefined>;
    return { params, pathname: "/transactions/create" } as const;
}

export function entrySeed({
    accountId,
    accountUnresolved,
    amount,
    attachment,
    categoryId,
    currency,
    date,
    details,
    income,
    installmentDraft,
    installments,
    note,
    receipt,
    recurringCoefficient,
    recurringType,
}: EntryParams): TransactionSeed {
    const seededAmount = plainNumber(amount);
    const seededDate = new Date(Number.parseInt(single(date) ?? "", 10));
    const seededType = plainNumber(recurringType);
    const seededCoefficient = plainNumber(recurringCoefficient);
    const seededCurrency = single(currency);
    const seededAttachment = single(attachment);
    const seededReceipt = single(receipt);
    const cadence = SELECTABLE_RECURRING_TYPES.find((type) => type === seededType);
    return {
        accountId: single(accountId),
        accountUnresolved: accountUnresolved === "1",
        amount: seededAmount > 0 && Math.round(seededAmount) < AMOUNT_CEILING ? seededAmount : undefined,
        attachment:
            seededAttachment !== undefined && SCAN_ATTACHMENT.test(seededAttachment) ? seededAttachment : undefined,
        categoryId: single(categoryId),
        currency: seededCurrency !== undefined && isPickableCurrency(seededCurrency) ? seededCurrency : undefined,
        date: Number.isNaN(seededDate.getTime()) ? undefined : seededDate,
        details: single(details),
        income: income === "1",
        installmentDraft: parseInstallmentSeed(single(installmentDraft)),
        installments: installments === "1",
        note: single(note),
        receipt: parseReceipt(seededReceipt) === null ? undefined : seededReceipt,
        recurrence:
            cadence === undefined
                ? undefined
                : {
                      coefficient: Number.isInteger(seededCoefficient) && seededCoefficient > 0 ? seededCoefficient : 1,
                      type: cadence,
                  },
    };
}

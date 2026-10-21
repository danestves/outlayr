import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import type { TransactionInput } from "@/data/transactions-core";

export interface TransactionSaveDraft {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    coefficient: number;
    currency: string | null;
    customColor: string | null;
    date: Date;
    details: string;
    emoji: string | null;
    endDate: Date;
    exchangeRate?: number | null;
    exchangeRateType?: EntryRateType | null;
    hasEndDate: boolean;
    icon: string | null;
    imageColor: string | null;
    imageUri: string | null;
    income: boolean;
    isSubscription: boolean;
    leadDays: number | null;
    note: string;
    recurringType: number;
}

// `isSubscription` is the single gate, so a row switched back to "once" never resurrects a stale lead or end date.
export function buildTransactionInput(draft: TransactionSaveDraft): TransactionInput {
    const input: TransactionInput = {
        accountId: draft.accountId,
        amount: draft.amount,
        categoryId: draft.categoryId,
        currency: draft.currency,
        customColor: draft.customColor,
        date: draft.date,
        details: draft.details,
        emoji: draft.emoji,
        icon: draft.icon,
        imageColor: draft.imageColor,
        imageUri: draft.imageUri,
        income: draft.income,
        note: draft.note,
        onceRecurring: draft.isSubscription,
        recurringCoefficient: draft.isSubscription ? Math.max(1, draft.coefficient) : 1,
        recurringEndDate: draft.isSubscription && draft.hasEndDate ? draft.endDate : null,
        recurringType: draft.isSubscription ? draft.recurringType : RECURRING_TYPE.none,
        reminderLeadDays: draft.isSubscription ? draft.leadDays : null,
    };
    // Absent, not undefined: an untouched rate keeps what is stored, and `keptCanonical` reads the pair as a unit.
    if (draft.exchangeRate !== undefined) {
        input.exchangeRate = draft.exchangeRate;
    }
    if (draft.exchangeRateType !== undefined) {
        input.exchangeRateType = draft.exchangeRateType;
    }
    return input;
}

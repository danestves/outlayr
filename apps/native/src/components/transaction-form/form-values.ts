import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import type { DeepKeys, DeepValue, UpdateMetaOptions, Updater } from "@tanstack/react-form";

import type { IdentitySelection } from "@/components/identity-picker-shared";
import { getAccountById, getLastUsedAccount } from "@/data/accounts-core";
import { cardFeeFor } from "@/data/card-fees-core";
import { getCategoryById } from "@/data/categories-core";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { feeDraftOf } from "@/domain/card-fee";
import type { FeeDraft } from "@/domain/card-fee";
import type { InstallmentSeed } from "@/domain/installment-scan";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad } from "@/domain/numpad";
import { isPaidVia, paidViaCharge } from "@/domain/paid-via";
import { normalizeLead } from "@/domain/subscription-reminder";
import type { LogAgainDraft } from "@/domain/transaction-actions";
import type { PendingCategory } from "@/hooks/use-transaction-enrichment";

import { initialEntryRateType, seededRate } from "./entry-rate";

// A quick action, widget or App Intent may set only amount, direction and note. The rest are for the voice screen,
// whose draft the user already read, with categories and accounts this ledger resolved by name.
export interface TransactionSeed {
    accountId?: string;
    attachment?: string;
    /** Named but not placed: the form opens with no account rather than the last used one. */
    accountUnresolved?: boolean;
    amount?: number;
    categoryId?: string;
    currency?: string;
    date?: Date;
    details?: string;
    income?: boolean;
    installmentDraft?: InstallmentSeed;
    installments?: boolean;
    note?: string;
    receipt?: string;
    recurrence?: { coefficient: number; type: number };
}

function seedAccount(db: Database, initial: Transaction | undefined, seed: TransactionSeed | undefined) {
    if (initial) {
        return initial.accountId ? getAccountById(db, initial.accountId) : null;
    }
    if (seed?.accountUnresolved || (seed?.installments && !seed.accountId)) {
        return null;
    }
    return (seed?.accountId ? getAccountById(db, seed.accountId) : null) ?? getLastUsedAccount(db);
}

interface FormSeed {
    copyOf?: LogAgainDraft;
    db: Database;
    globalCurrency: string;
    initial?: Transaction;
    nameSeed: string;
    seed?: TransactionSeed;
}

// oxlint-disable-next-line complexity -- the seed has to reconcile initial, copyOf and seed across category, currency and rate in one pass, because `useForm` only reads it once
export function initialFormValues({ copyOf, db, globalCurrency, initial, nameSeed, seed }: FormSeed) {
    const sourceId = initial?.categoryId ?? copyOf?.categoryId ?? seed?.categoryId;
    const seedCategory = sourceId ? getCategoryById(db, sourceId) : null;
    const currencySeed = initial?.currency ?? copyOf?.currency ?? seed?.currency ?? null;
    const amountSeed = initial?.amount ?? copyOf?.amount ?? seed?.amount;
    const effectiveCurrency = currencySeed ?? globalCurrency;
    const savedFee = initial ? cardFeeFor(db, initial.id) : null;
    const paidVia = initial && isPaidVia(initial.paidVia) ? initial.paidVia : null;
    const feeFollowsPaidVia =
        initial != null &&
        paidVia !== null &&
        savedFee?.feeRate == null &&
        (savedFee?.amount ?? null) === paidViaCharge(paidVia, initial.amount);
    const feeSeed: FeeDraft | null = initial && !feeFollowsPaidVia ? feeDraftOf(savedFee) : null;
    // SAFETY: fields that start empty carry the type they end up holding, not the empty literal's.
    return {
        account: seedAccount(db, initial, seed),
        amount: amountSeed == null ? "" : numberToNumpad(amountSeed, minorUnitsFor(currencySeed ?? globalCurrency)),
        category: seedCategory,
        coefficient: initial?.recurringCoefficient ?? seed?.recurrence?.coefficient ?? 1,
        date: initial ? new Date(initial.date) : (seed?.date ?? new Date()),
        endDate: initial?.recurringEndDate ? new Date(initial.recurringEndDate) : oneYearFrom(new Date()),
        exchangeRateType: initialEntryRateType(effectiveCurrency, initial?.exchangeRateType),
        fee: feeSeed,
        feeCategoryId: savedFee?.categoryId ?? null,
        hasEndDate: initial?.recurringEndDate != null,
        income: seedCategory?.income ?? initial?.income ?? copyOf?.income ?? seed?.income ?? false,
        // From the live schedule, not `onceRecurring`, which stays true on every back-filled occurrence. Only the row
        // still charging has `recurringType > 0`.
        isSubscription:
            (initial?.recurringType ?? RECURRING_TYPE.none) !== RECURRING_TYPE.none || seed?.recurrence != null,
        leadDays: normalizeLead(initial?.reminderLeadDays ?? null),
        merchant: nameSeed,
        // Seeds the uncontrolled inline field (controlled, the caret would jump); only the stage's merchant step writes
        // it.
        merchantSeed: nameSeed,
        paidVia,
        pendingCategory: null as PendingCategory | null,
        pendingTagNames: [] as readonly string[],
        rateEntry: seededRate(effectiveCurrency, initial?.exchangeRate),
        recurringType:
            initial?.recurringType && initial.recurringType !== RECURRING_TYPE.none
                ? initial.recurringType
                : (seed?.recurrence?.type ?? RECURRING_TYPE.monthly),
        tagIds: [] as string[],
        txCurrency: currencySeed,
    };
}

export type TransactionFormValues = ReturnType<typeof initialFormValues>;

export interface EntryForm {
    setFieldValue: <TField extends DeepKeys<TransactionFormValues>>(
        field: TField,
        updater: Updater<DeepValue<TransactionFormValues, TField>>,
        opts?: UpdateMetaOptions
    ) => void;
    readonly state: { readonly values: TransactionFormValues };
}

export function identitySeedOf(initial: Transaction | undefined, copyOf: LogAgainDraft | undefined): IdentitySelection {
    return {
        color: initial?.customColor ?? copyOf?.customColor ?? null,
        emoji: initial?.emoji ?? copyOf?.emoji ?? null,
        icon: initial?.icon ?? copyOf?.icon ?? null,
        photoColor: initial?.imageColor ?? null,
        photoUri: initial?.imageUri ?? null,
    };
}

function oneYearFrom(date: Date): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1);
    return d;
}

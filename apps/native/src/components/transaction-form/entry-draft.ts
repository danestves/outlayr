import type { CardFeeInput } from "@outlayr/money/card-fee";

import type { IdentitySelection } from "@/components/identity-picker-shared";
import { minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import type { PaidVia } from "@/domain/paid-via";
import type { Allocation } from "@/domain/split";
import { isRealSplit } from "@/domain/split-draft";
import type { EntryCommit, EntryDraft } from "@/state/entry-commit";

import { entryRateOf } from "./entry-rate";
import type { TransactionFormValues } from "./form-values";

export interface FormEntryFacts {
    allocations: readonly Allocation[];
    details: string | null;
    fee: (label: string, categoryId: string | null, amount: number) => CardFeeInput | null | undefined;
    identity: IdentitySelection;
    ledgerCurrency: string;
    paidVia: PaidVia | null;
    receipt: string | undefined;
    siblings: NonNullable<EntryCommit["pendingCategory"]>["siblings"];
}

interface FormEntry extends Required<Pick<EntryCommit, "draft" | "splits">>, Pick<EntryCommit, "pendingCategory"> {
    amount: number;
    currency: string;
}

export function formEntry(value: TransactionFormValues, facts: FormEntryFacts): FormEntry {
    const { identity } = facts;
    const currency = value.txCurrency ?? facts.ledgerCurrency;
    // Rounded to the currency's units at save: switching currency mid-entry leaves the typed digits
    // alone, so 12.34 typed in USD would show as ¥12 while the row kept 12.34.
    const amount = roundToMinorUnits(numpadToNumber(value.amount), currency);
    const draft: EntryDraft = {
        accountId: value.account?.id ?? null,
        amount,
        categoryId: value.category?.id ?? null,
        currency: value.txCurrency,
        customColor: identity.color,
        date: value.date,
        details: facts.details,
        emoji: identity.emoji,
        exchangeRate: value.exchangeRateType == null ? null : entryRateOf(value.rateEntry, currency),
        exchangeRateType: value.exchangeRateType,
        fee: (categoryId) => facts.fee(value.merchant.trim() || (value.category?.name ?? ""), categoryId, amount),
        icon: identity.icon,
        imageColor: identity.photoColor,
        imageUri: identity.photoUri,
        income: value.income,
        merchant: value.merchant,
        paidVia: facts.paidVia,
        receipt: facts.receipt,
        schedule: value.isSubscription
            ? {
                  coefficient: value.coefficient,
                  endDate: value.hasEndDate ? value.endDate : null,
                  leadDays: value.leadDays,
                  type: value.recurringType,
              }
            : null,
    };
    return {
        amount,
        currency,
        draft,
        pendingCategory:
            value.category || !value.pendingCategory
                ? undefined
                : { siblings: facts.siblings, value: value.pendingCategory },
        splits: {
            allocations: isRealSplit(facts.allocations) ? facts.allocations : [],
            decimals: minorUnitsFor(currency),
        },
    };
}

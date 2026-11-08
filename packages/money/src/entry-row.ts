import * as Effect from "effect/Effect";

import { firstOfMonth, startOfDay } from "./calendar";
import { canonicalUsd } from "./canonical-usd";
import type { CanonicalUsd } from "./canonical-usd";
import { isTransactionRateNeeded } from "./rates";
import type { EntryRateType, RateLookup } from "./rates";

export interface EntryInput {
    accountId?: string | null;
    amount: number;
    categoryId: string | null;
    /** null = adopt the ledger's currency, which the write stamps in. */
    currency: string | null;
    customColor?: string | null;
    date: Date;
    details: string | null;
    emoji?: string | null;
    exchangeRate?: number | null;
    exchangeRateType?: EntryRateType | null;
    icon?: string | null;
    imageColor?: string | null;
    /** Logo photo URI; `icon`, `emoji` and this exclude each other. */
    imageUri?: string | null;
    income: boolean;
    note: string;
    onceRecurring?: boolean;
    paidVia?: string | null;
    receipt?: string | null;
    recurringCoefficient?: number;
    recurringEndDate?: Date | null;
    /** Cadence: none=0, daily=1, weekly=2, monthly=3, yearly=4. */
    recurringType?: number;
    /** Days of notice for the due-date reminder; null is off, 0 is the day itself. */
    reminderLeadDays?: number | null;
    unreviewed?: boolean;
}

const MAX_LEAD_DAYS = 30;

// `null` is off and must stay distinct from `0`, which means "on the due day itself".
export function normalizeLead(raw: number | null): number | null {
    if (raw == null || !Number.isFinite(raw)) {
        return null;
    }
    return Math.min(MAX_LEAD_DAYS, Math.max(0, Math.floor(raw)));
}

/** The note an entry saves: a blank one falls back to its category's name. */
const noteOf = (input: EntryInput, categoryName: string | null) => input.note.trim() || (categoryName ?? "");

export const entryRow = Effect.fn("EntryRow.entryRow")(function* entryRow<E>(
    lookup: RateLookup<E>,
    id: string,
    input: EntryInput,
    ledger: {
        categoryName: string | null;
        // Stamped even when unpicked: a null currency would follow the setting and restate a $18.50 lunch as €18.50.
        currency: string;
        now: Date;
    }
) {
    const details = input.details?.trim() ? input.details.trim() : null;
    const recurring = input.onceRecurring ?? false;
    const { currency, now } = ledger;
    const canonical = yield* canonicalUsd(lookup, {
        amount: Math.abs(input.amount),
        currency,
        date: input.date,
        displayCurrency: currency,
        exchangeRate: input.exchangeRate,
        exchangeRateType: input.exchangeRateType,
    });
    return {
        accountId: input.accountId ?? null,
        amount: Math.abs(input.amount),
        categoryId: input.categoryId,
        currency,
        customColor: input.customColor ?? null,
        date: input.date,
        day: startOfDay(input.date),
        details,
        emoji: input.emoji ?? null,
        icon: input.icon ?? null,
        id,
        imageColor: input.imageColor ?? null,
        imageUri: input.imageUri ?? null,
        income: input.income,
        month: firstOfMonth(input.date),
        note: noteOf(input, ledger.categoryName),
        onceRecurring: recurring,
        paidVia: input.paidVia,
        receipt: input.receipt,
        // Re-derived on every write, so an edited first payment re-anchors the chain.
        recurringAnchorDay: recurring ? input.date.getDate() : null,
        recurringCoefficient: recurring ? Math.max(1, input.recurringCoefficient ?? 1) : 1,
        recurringEndDate: recurring ? (input.recurringEndDate ?? null) : null,
        recurringType: recurring ? (input.recurringType ?? 0) : 0,
        reminderLeadDays: recurring ? normalizeLead(input.reminderLeadDays ?? null) : null,
        // Frozen at write; converting at read time would change last month's spending every morning.
        ...canonical,
        deletedAt: null,
        unreviewed: input.unreviewed ?? false,
        updatedAt: now,
    };
});

interface FrozenEntry extends CanonicalUsd {
    amount: number;
    currency: string | null;
    date: Date;
}

/**
 * Keeps the frozen value unless amount, currency or date moved: re-freezing is unsafe, since the rate feed serves
 * 90 days and an older entry would come back unresolvable. A moved field returns null for the backfill to retry.
 */
export function keptCanonical(
    next: { amount: number; currency?: string | null; date: Date },
    previous: FrozenEntry | null,
    input: Pick<EntryInput, "exchangeRate" | "exchangeRateType">
): CanonicalUsd | null {
    if (
        previous == null ||
        previous.amount !== next.amount ||
        previous.currency !== next.currency ||
        previous.date.getTime() !== next.date.getTime()
    ) {
        return null;
    }
    if (input.exchangeRate === undefined && input.exchangeRateType === undefined) {
        return {
            amountUsd: previous.amountUsd,
            exchangeRate: previous.exchangeRate,
            exchangeRateType: previous.exchangeRateType,
        };
    }
    const requestedRateType = next.currency === "USD" ? null : (input.exchangeRateType ?? "official");
    if (previous.exchangeRateType !== requestedRateType) {
        return null;
    }
    if (input.exchangeRate !== undefined && previous.exchangeRate !== input.exchangeRate) {
        return null;
    }
    if (previous.amountUsd === null && !isTransactionRateNeeded(previous)) {
        return null;
    }
    return {
        amountUsd: previous.amountUsd,
        exchangeRate: previous.exchangeRate,
        exchangeRateType: previous.exchangeRateType,
    };
}

/**
 * An absent key keeps the notice: a form with no lead picker omits it, and `entryRow`'s null would silently turn
 * it off. An explicit `null` means off; ending the schedule clears it regardless.
 */
export function keptLead(
    next: { onceRecurring?: boolean; reminderLeadDays?: number | null },
    previous: { reminderLeadDays: number | null } | null,
    input: Pick<EntryInput, "reminderLeadDays">
): number | null {
    if (!next.onceRecurring) {
        return null;
    }
    return input.reminderLeadDays === undefined
        ? (previous?.reminderLeadDays ?? null)
        : (next.reminderLeadDays ?? null);
}

/** Same contract as {@link keptLead}: CSV import and App Intents omit the field; only explicit `null` detaches. */
export function keptAccount(
    previous: { accountId: string | null } | null,
    input: Pick<EntryInput, "accountId">
): string | null {
    return input.accountId === undefined ? (previous?.accountId ?? null) : input.accountId;
}

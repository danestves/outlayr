import * as Effect from "effect/Effect";

import { firstOfMonth, startOfDay } from "./calendar";
import { canonicalUsd } from "./canonical-usd";
import { utcDateString } from "./dates";
import type { EntryRateType, RateLookup } from "./rates";
import { RECURRING_TYPE, anchorDayOf, nextLanding } from "./recurrence";
import { uuidV5 } from "./uuid5";

// Never change: a different namespace gives upgraded devices different ids for occurrences the others already hold.
const OCCURRENCE_NAMESPACE = "0f2b9f1e-6d3a-4c58-9a71-2c8f5d6e4b31";

// Derived, not minted, so two synced devices sweeping one schedule compute one id and the second upserts. The UTC
// day, not the local one, or devices in different zones derive two ids for one charge.
export function occurrenceId(parentLocalId: string, holding: Date): string {
    return uuidV5(`${parentLocalId}:${utcDateString(holding.getTime())}`, OCCURRENCE_NAMESPACE);
}

export const occurrenceFeeId = (occurrence: string) => uuidV5(`${occurrence}:fee`, OCCURRENCE_NAMESPACE);

export function recurrenceRateType(rateType: string | null | undefined): EntryRateType {
    if (rateType === "custom") {
        return "custom";
    }
    if (rateType === "eur_reference") {
        return "eur_reference";
    }
    return "official";
}

interface OccurrenceSource {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    currency: string | null;
    customColor: string | null;
    date: Date;
    details: string | null;
    emoji: string | null;
    exchangeRateType: string | null;
    icon: string | null;
    id: string;
    imageColor: string | null;
    imageKey: string | null;
    imageUri: string | null;
    income: boolean;
    note: string;
    onceRecurring: boolean;
    recurringAnchorDay: number | null;
    recurringCoefficient: number;
    recurringEndDate: Date | null;
    recurringType: number;
    reminderLeadDays: number | null;
}

export function occurrenceRow(source: OccurrenceSource, holding: Date, carriesSchedule: boolean, now: Date) {
    return {
        accountId: source.accountId,
        amount: source.amount,
        categoryId: source.categoryId,
        currency: source.currency,
        customColor: source.customColor,
        date: holding,
        day: startOfDay(holding),
        deletedAt: null,
        details: source.details,
        emoji: source.emoji,
        exchangeRateType: source.exchangeRateType ?? "official",
        icon: source.icon,
        id: occurrenceId(source.id, holding),
        imageColor: source.imageColor,
        imageKey: source.imageKey,
        imageUri: source.imageUri,
        income: source.income,
        month: firstOfMonth(holding),
        note: source.note,
        onceRecurring: true,
        recurringAnchorDay: carriesSchedule ? anchorDayOf(source) : null,
        recurringCoefficient: carriesSchedule ? source.recurringCoefficient : 1,
        recurringEndDate: carriesSchedule ? source.recurringEndDate : null,
        recurringType: carriesSchedule ? source.recurringType : RECURRING_TYPE.none,
        reminderLeadDays: carriesSchedule ? source.reminderLeadDays : null,
        updatedAt: now,
    };
}

// Each occurrence is canonicalized at ITS OWN date, or January's payment is priced at December's rate.
export const canonicalOccurrence = Effect.fn("Occurrence.canonicalOccurrence")(function* canonicalOccurrence<
    E,
    Row extends { amount: number; currency: string | null; date: Date; exchangeRateType: string | null },
>(lookup: RateLookup<E>, row: Row, displayCurrency: string) {
    const canonical = yield* canonicalUsd(lookup, {
        amount: row.amount,
        currency: row.currency,
        date: row.date,
        displayCurrency,
        exchangeRate: null,
        exchangeRateType: recurrenceRateType(row.exchangeRateType),
    });
    return { ...row, ...canonical };
});

// Anchored at the next occurrence after today, so a stale carrier resumes forward instead of back-charging. A
// future-dated carrier is the pending charge itself, so removing it means stop: no successor.
export function successorRow(carrier: OccurrenceSource, now: Date) {
    if (!carrier.onceRecurring || carrier.recurringType === RECURRING_TYPE.none) {
        return null;
    }
    if (startOfDay(carrier.date).getTime() > startOfDay(now).getTime()) {
        return null;
    }
    const landing = nextLanding(
        carrier.date,
        carrier.recurringType,
        carrier.recurringCoefficient,
        carrier.recurringEndDate,
        now,
        anchorDayOf(carrier)
    );
    return landing == null ? null : occurrenceRow(carrier, landing, true, now);
}

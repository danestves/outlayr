import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";

import { numpadToNumber } from "@/domain/numpad";
import { flipRateForQuote, formatQuotedRate } from "@/domain/transaction-entry-rate";
import type { TransactionEntryRate } from "@/domain/transaction-entry-rate";

export interface RateEntry {
    seed: number | null;
    text: string;
}

export const NO_RATE: RateEntry = { seed: null, text: "" };

export interface RateSnapshot {
    entry: RateEntry;
    fromSuggestion: boolean;
    type: EntryRateType | null;
}

export function seededRate(currency: string, rate: number | null | undefined): RateEntry {
    return rate != null && Number.isFinite(rate) && rate > 0
        ? { seed: rate, text: formatQuotedRate(currency, rate) }
        : NO_RATE;
}

export function entryRateOf({ seed, text }: RateEntry, currency: string): number | null {
    if (seed !== null && text === formatQuotedRate(currency, seed)) {
        return seed;
    }
    return text === "" ? null : flipRateForQuote(currency, numpadToNumber(text));
}

export function isProviderRate(rate: number | null | undefined, rateType: EntryRateType | null): boolean {
    return rate != null && rateType != null && rateType !== "custom";
}

export function initialEntryRateType(currency: string, rateType: string | null | undefined): EntryRateType | null {
    if (currency === "USD") {
        return null;
    }
    const normalized = ENTRY_RATE_TYPES.find((candidate) => candidate === rateType);
    if (normalized === "eur_reference" && currency !== "VES") {
        return "official";
    }
    return normalized ?? "official";
}

// `official` stands in for an absent type: that is what an unanswered non-USD entry records.
export function rateSelectionOf(
    rate: RateEntry,
    exchangeRateType: EntryRateType | null,
    currency: string
): TransactionEntryRate {
    return {
        exchangeRate: entryRateOf(rate, currency),
        exchangeRateType: exchangeRateType ?? "official",
    };
}

export type RateAction =
    | { kind: "currency"; next: string }
    | { kind: "custom"; prior: number | null }
    | { kind: "date"; moved: boolean }
    | { kind: "derived"; rate: number }
    | { kind: "restore"; snapshot: RateSnapshot }
    | { kind: "suggestion"; rate: number; type: EntryRateType }
    | { kind: "text"; text: string }
    | { kind: "type"; type: EntryRateType };

export interface RatePatch {
    entry?: RateEntry;
    fromSuggestion: boolean;
    type?: EntryRateType | null;
}

function currencyPatch(state: RateSnapshot, currency: string, next: string): RatePatch {
    const patch: RatePatch =
        next === currency ? { fromSuggestion: state.fromSuggestion } : { entry: NO_RATE, fromSuggestion: false };
    if (next === "USD") {
        return { ...patch, entry: NO_RATE, type: null };
    }
    if (state.type == null || (state.type === "eur_reference" && next !== "VES")) {
        return { ...patch, entry: NO_RATE, type: "official" };
    }
    return patch;
}

export function rateAfter(state: RateSnapshot, currency: string, action: RateAction): RatePatch {
    switch (action.kind) {
        case "currency": {
            return currencyPatch(state, currency, action.next);
        }
        case "custom": {
            return action.prior === null
                ? { fromSuggestion: state.fromSuggestion }
                : { entry: seededRate(currency, action.prior), fromSuggestion: true, type: "custom" };
        }
        case "date": {
            return action.moved && state.fromSuggestion
                ? { entry: NO_RATE, fromSuggestion: false }
                : { fromSuggestion: state.fromSuggestion };
        }
        case "derived": {
            return { entry: seededRate(currency, action.rate), fromSuggestion: false, type: "custom" };
        }
        case "restore": {
            return { ...action.snapshot };
        }
        case "suggestion": {
            return { entry: seededRate(currency, action.rate), fromSuggestion: true, type: action.type };
        }
        case "text": {
            return state.type === "custom"
                ? { entry: { seed: state.entry.seed, text: action.text }, fromSuggestion: false }
                : { entry: { seed: null, text: action.text }, fromSuggestion: false, type: "custom" };
        }
        case "type": {
            return { entry: NO_RATE, fromSuggestion: false, type: action.type };
        }
        default: {
            const unhandled: never = action;
            throw new Error(`Unhandled rate action: ${JSON.stringify(unhandled)}`);
        }
    }
}

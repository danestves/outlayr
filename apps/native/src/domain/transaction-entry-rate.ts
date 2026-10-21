import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { METAL_CURRENCY_CODES } from "@outlayr/money/currency";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";

import { currencySymbol, formatFixed } from "@/domain/money";
import type { Language } from "@/i18n/languages";

export interface TransactionEntryRate {
    exchangeRate: number | null;
    exchangeRateType: EntryRateType;
}

export type TransactionRateError = "customRateRequired" | "eurReferenceRequiresVes" | null;

const QUOTED_IN_USD: ReadonlySet<string> = new Set([
    "AUD",
    "EUR",
    "FKP",
    "GBP",
    "GGP",
    "GIP",
    "IMP",
    "JEP",
    "NZD",
    "SHP",
    ...METAL_CURRENCY_CODES,
]);

function quoteRank(code: string): number {
    if (QUOTED_IN_USD.has(code)) {
        return 2;
    }
    return code === "USD" ? 1 : 0;
}

export function pairQuotedInverse(from: string, to: string, reference: number | null = null): boolean {
    const fromRank = quoteRank(from);
    const toRank = quoteRank(to);
    if (fromRank !== toRank) {
        return toRank > fromRank;
    }
    return reference !== null && reference < 1;
}

export function quotePairRate(inverse: boolean, rate: number): number {
    return inverse ? 1 / rate : rate;
}

export function flipRateForQuote(currency: string, rate: number): number {
    return rate > 0 ? quotePairRate(pairQuotedInverse("USD", currency), rate) : rate;
}

const SHARED_SYMBOLS: ReadonlySet<string> = new Set(
    PICKABLE_CURRENCY_CODES.map((code) => CURRENCY_META[code].symbol).filter(
        (symbol, index, symbols) => symbols.indexOf(symbol) !== index
    )
);

const SYMBOL_OWNERS = new Map([
    ["$", "USD"],
    ["£", "GBP"],
    ["₩", "KRW"],
]);

function unitSymbol(code: string): string {
    const symbol = currencySymbol(code);
    return SHARED_SYMBOLS.has(symbol) && SYMBOL_OWNERS.get(symbol) !== code ? code : symbol;
}

export function pairUnitSymbols(from: string, to: string, inverse = pairQuotedInverse(from, to)) {
    return inverse
        ? { base: unitSymbol(to), quote: unitSymbol(from) }
        : { base: unitSymbol(from), quote: unitSymbol(to) };
}

export function transactionRateOptions(currency: string): EntryRateType[] {
    if (currency === "USD") {
        return [];
    }

    return ENTRY_RATE_TYPES.filter((rateType) => rateType !== "eur_reference" || currency === "VES");
}

// A provider type falls back to its suggestion: selecting "official" without applying it still records official.
export function effectiveEntryRate(
    selection: TransactionEntryRate,
    suggestions: { eurReference: number | null; official: number | null }
): number | null {
    if (selection.exchangeRate !== null && Number.isFinite(selection.exchangeRate) && selection.exchangeRate > 0) {
        return selection.exchangeRate;
    }
    if (selection.exchangeRateType === "official") {
        return suggestions.official;
    }
    return selection.exchangeRateType === "eur_reference" ? suggestions.eurReference : null;
}

export const RATE_ENTRY_DECIMALS = 4;

export function rateEntryText(rate: number): string {
    const rounded = Number(rate.toFixed(RATE_ENTRY_DECIMALS));
    return rounded > 0 ? String(rounded) : "";
}

// Display only: callers must still apply the UNROUNDED rate.
export function formatQuotedRate(currency: string, rate: number): string {
    return rateEntryText(flipRateForQuote(currency, rate));
}

const RATE_SIGNIFICANT_DIGITS = 5;

const RATE_MAX_DECIMALS = 10;

const RATE_MIN_DECIMALS = 2;

export function formatRateFigure(rate: number, language?: Language): string {
    if (rate >= 1) {
        const [, fraction = ""] = rateEntryText(rate).split(".");
        return formatFixed(rate, Math.max(RATE_MIN_DECIMALS, fraction.length), language);
    }
    const decimals = Math.min(RATE_MAX_DECIMALS, RATE_SIGNIFICANT_DIGITS - (Math.floor(Math.log10(rate)) + 1));
    return formatFixed(rate, decimals, language);
}

export function formatQuotedRateFigure(currency: string, rate: number, language?: Language): string {
    return formatRateFigure(flipRateForQuote(currency, rate), language);
}

export function rateDeltaPercent(currency: string, rate: number, reference: number): number {
    return (flipRateForQuote(currency, rate) / flipRateForQuote(currency, reference) - 1) * 100;
}

export function transactionRateError(currency: string, selection: TransactionEntryRate): TransactionRateError {
    if (selection.exchangeRateType === "eur_reference" && currency !== "VES") {
        return "eurReferenceRequiresVes";
    }

    if (
        selection.exchangeRateType === "custom" &&
        (selection.exchangeRate === null || !Number.isFinite(selection.exchangeRate) || selection.exchangeRate <= 0)
    ) {
        return "customRateRequired";
    }

    return null;
}

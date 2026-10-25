import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import type { Locale } from "expo-localization";

import { firstLocale } from "@/i18n/device-language";
import { languageSubtag } from "@/i18n/languages";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";

export const DEFAULT_CURRENCY = "USD";

export interface NumberLocale {
    decimal: string;
    group: string;
    /** For `NumberFlow`'s `formatToParts`; the separators below must mirror what this tag produces. */
    tag: string;
}

const ENGLISH: NumberLocale = { decimal: ".", group: ",", tag: "en-US" };

type DeviceNumbers = Pick<Locale, "decimalSeparator" | "digitGroupingSeparator" | "regionCode">;

type RegionalLanguage = Exclude<Language, "en">;

const REGIONAL_FALLBACK = {
    es: { decimal: ".", group: ",", tag: "es-419" },
    "es-ES": { decimal: ",", group: ".", tag: "es-ES" },
    pt: { decimal: ",", group: ".", tag: "pt-BR" },
    "pt-PT": { decimal: ",", group: "\u00A0", tag: "pt-PT" },
} satisfies Record<RegionalLanguage, NumberLocale>;

export function regionalLocale(language: RegionalLanguage, device: DeviceNumbers | null): NumberLocale {
    const fallback = REGIONAL_FALLBACK[language];
    return {
        decimal: device?.decimalSeparator ?? fallback.decimal,
        group: device?.digitGroupingSeparator ?? fallback.group,
        tag: device?.regionCode ? `${languageSubtag(language)}-${device.regionCode}` : fallback.tag,
    };
}

// ponytail: read once per launch; a region changed mid-session shows after a relaunch.
const regional: Partial<Record<RegionalLanguage, NumberLocale>> = {};

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

function splitFixed(fixed: string, locale: NumberLocale) {
    const [integer = "0", fraction = ""] = fixed.split(".");
    return { fraction, integer: integer.replaceAll(THOUSANDS, locale.group) };
}

export function formatFixed(value: number, decimals: number, language: Language = runtimeLanguage()): string {
    const locale = numberLocale(language);
    const fixed = Math.abs(value).toFixed(decimals);
    const { fraction, integer } = splitFixed(fixed, locale);
    const sign = value < 0 && Number(fixed) > 0 ? "-" : "";
    return `${sign}${fraction === "" ? integer : `${integer}${locale.decimal}${fraction}`}`;
}

export function numberLocale(language: Language = runtimeLanguage()): NumberLocale {
    if (language === "en") {
        return ENGLISH;
    }
    regional[language] ??= regionalLocale(language, firstLocale());
    return regional[language];
}

export { decimalsFor as minorUnitsFor } from "@outlayr/money/currency";

export function currencySymbol(code: string): string {
    return currencyDisplayFor(code).symbol;
}

/** CLDR's currency spacing, which Hermes' `Intl` cannot apply. */
const SPACED_SYMBOL = /[^\p{S}]$/u;

export function symbolPrefix(symbol: string): string {
    return SPACED_SYMBOL.test(symbol) ? `${symbol}\u00A0` : symbol;
}

const SHARED_SYMBOLS: ReadonlySet<string> = new Set(
    PICKABLE_CURRENCY_CODES.map((code) => CURRENCY_META[code].symbol).filter(
        (symbol, index, symbols) => symbols.indexOf(symbol) !== index
    )
);

export function symbolIsShared(code: string): boolean {
    return SHARED_SYMBOLS.has(currencySymbol(code));
}

export function roundToMinorUnits(amount: number, code: string): number {
    return roundMoney(amount, decimalsFor(code));
}

export interface AmountParts {
    fraction: string;
    integer: string;
    locale: NumberLocale;
    minorUnits: number;
    symbol: string;
}

// Separators come from the language (and, for Spanish, the region), not `Intl`: Hermes lacks full ICU.
export function amountParts(
    amount: number,
    code: string,
    showCents = true,
    language: Language = runtimeLanguage()
): AmountParts {
    const locale = numberLocale(language);
    const minorUnits = showCents ? decimalsFor(code) : 0;
    const rounded = roundMoney(Math.abs(amount), minorUnits);
    const { fraction, integer } = splitFixed(rounded.toFixed(minorUnits), locale);
    return {
        fraction: minorUnits > 0 ? fraction : "",
        integer,
        locale,
        minorUnits,
        symbol: currencySymbol(code),
    };
}

export function amountDigits(parts: AmountParts): string {
    return parts.fraction ? `${parts.integer}${parts.locale.decimal}${parts.fraction}` : parts.integer;
}

export const AMOUNT_MASK = "••••";

export function maskedAmount(code: string): string {
    return `${symbolPrefix(currencySymbol(code))}${AMOUNT_MASK}`;
}

export function withCurrencySymbol(parts: AmountParts, digits: string): string {
    return `${symbolPrefix(parts.symbol)}${digits}`;
}

export function formatAmount(
    amount: number,
    code: string,
    showCents = true,
    language: Language = runtimeLanguage()
): string {
    const parts = amountParts(amount, code, showCents, language);
    return withCurrencySymbol(parts, amountDigits(parts));
}

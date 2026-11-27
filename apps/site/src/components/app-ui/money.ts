import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import type { Locale } from "@outlayr/shared/i18n";

const NUMBERS = {
    de: { decimal: ",", group: "." },
    en: { decimal: ".", group: "," },
    es: { decimal: ".", group: "," },
    fr: { decimal: ",", group: "\u202F" },
    it: { decimal: ",", group: "." },
    ja: { decimal: ".", group: "," },
    ko: { decimal: ".", group: "," },
    nl: { decimal: ",", group: "." },
    pt: { decimal: ",", group: "." },
} as const satisfies Record<Locale, { decimal: string; group: string }>;

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const SPACED_SYMBOL = /[^\p{S}]$/u;

export interface AmountParts {
    decimal: string;
    fraction: string;
    integer: string;
    minorUnits: number;
    symbol: string;
}

function splitFixed(fixed: string, locale: Locale) {
    const [integer = "0", fraction = ""] = fixed.split(".");
    return { fraction, integer: integer.replaceAll(THOUSANDS, NUMBERS[locale].group) };
}

export function formatFixed(value: number, decimals: number, locale: Locale): string {
    const fixed = Math.abs(value).toFixed(decimals);
    const { fraction, integer } = splitFixed(fixed, locale);
    const sign = value < 0 && Number(fixed) > 0 ? "-" : "";
    return `${sign}${fraction === "" ? integer : `${integer}${NUMBERS[locale].decimal}${fraction}`}`;
}

export function symbolPrefix(symbol: string): string {
    return SPACED_SYMBOL.test(symbol) ? `${symbol}\u00A0` : symbol;
}

export function amountParts(amount: number, code: string, locale: Locale): AmountParts {
    const minorUnits = decimalsFor(code);
    const { fraction, integer } = splitFixed(roundMoney(Math.abs(amount), minorUnits).toFixed(minorUnits), locale);
    return {
        decimal: NUMBERS[locale].decimal,
        fraction: minorUnits > 0 ? fraction : "",
        integer,
        minorUnits,
        symbol: currencyDisplayFor(code).symbol,
    };
}

export function formatAmount(amount: number, code: string, locale: Locale): string {
    const { decimal, fraction, integer, symbol } = amountParts(amount, code, locale);
    return `${symbolPrefix(symbol)}${fraction ? `${integer}${decimal}${fraction}` : integer}`;
}

export function formatSignedAmount(amount: number, code: string, locale: Locale): string {
    const magnitude = formatAmount(amount, code, locale);
    return roundMoney(-amount, decimalsFor(code)) > 0 ? `-${magnitude}` : magnitude;
}

export function formatDayTotal(amount: number, code: string, locale: Locale): string {
    return `${amount < 0 ? "-" : "+"}${formatAmount(amount, code, locale)}`;
}

export function formatTrend(change: number, locale: Locale): string {
    return `${change < 0 ? "-" : "+"}${formatFixed(Math.abs(change) * 100, 1, locale)}%`;
}

export function amountHeroLength(amount: number, minorUnits: number): number {
    const integerDigits = Math.floor(Math.abs(amount)).toString().length;
    return integerDigits + Math.floor((integerDigits - 1) / 3) + (minorUnits > 0 ? minorUnits + 1 : 0);
}

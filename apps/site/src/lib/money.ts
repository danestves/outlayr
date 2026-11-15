import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import type { Locale } from "@outlayr/shared/i18n";

export const HOME_CURRENCY = {
    de: "EUR",
    en: "USD",
    es: "USD",
    fr: "EUR",
    pt: "BRL",
} as const satisfies Record<Locale, string>;

const formats = new Map<string, Intl.NumberFormat>();

function currencyFormat(code: string, tag: string, digits: number, codeOnly: boolean): Intl.NumberFormat {
    const key = `${tag}|${code}|${digits}|${codeOnly}`;
    let format = formats.get(key);
    if (!format) {
        format = new Intl.NumberFormat(tag, {
            currency: code,
            currencyDisplay: codeOnly ? "code" : "narrowSymbol",
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
            style: "currency",
        });
        formats.set(key, format);
    }
    return format;
}

export function moneyParts(amount: number, code: string, tag: string, digits: number = decimalsFor(code)) {
    const { symbol } = currencyDisplayFor(code);
    return currencyFormat(code, tag, digits, symbol === code)
        .formatToParts(amount)
        .map((part) => (part.type === "currency" ? { ...part, value: symbol } : part));
}

export function formatMoney(amount: number, code: string, tag: string, digits?: number): string {
    return moneyParts(amount, code, tag, digits)
        .map((part) => part.value)
        .join("");
}

export function formatPercent(percent: number, tag: string, digits = 0): string {
    return new Intl.NumberFormat(tag, { maximumFractionDigits: digits, style: "percent" }).format(percent / 100);
}

export function inputNumber(value: number, tag: string): string {
    return new Intl.NumberFormat(tag, { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

export function decimalSeparator(tag: string): string {
    return new Intl.NumberFormat(tag).formatToParts(1.5).find((part) => part.type === "decimal")?.value ?? ".";
}

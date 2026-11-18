import { localProPriceRow, proPrice } from "@outlayr/money/pro-prices";
import { LANGUAGES } from "@outlayr/shared/i18n";
import type { Locale } from "@outlayr/shared/i18n";

const US_DOLLAR = "US$";

function dollarSign(parts: Intl.NumberFormatPart[]): Intl.NumberFormatPart[] {
    const code = parts.findIndex((part) => part.type === "currency" && part.value === "USD");
    if (code === -1) {
        return parts;
    }
    const spaced = parts[code + 1]?.type === "literal";
    return [...parts.slice(0, code), { type: "currency", value: US_DOLLAR }, ...parts.slice(code + (spaced ? 2 : 1))];
}

function joined(parts: Intl.NumberFormatPart[]): string {
    return parts.map((part) => part.value).join("");
}

export function proPrices(country: string | null, language: Locale) {
    const local = localProPriceRow(country);
    const { amount: monthly, currency } = proPrice(country, "monthly");
    const { amount: yearly } = proPrice(country, "annual");
    const { amount: once } = proPrice(country, "lifetime");
    const format = new Intl.NumberFormat(local ? `${language}-${country}` : LANGUAGES[language].lang, {
        currency,
        style: "currency",
        trailingZeroDisplay: "stripIfInteger",
    });
    const price = (amount: number) => dollarSign(format.formatToParts(amount));
    const parts = price(monthly);
    const decimal = parts.findIndex((part) => part.type === "decimal");
    const split = decimal === -1 ? parts.length : decimal;
    return {
        country: local ? country : null,
        monthly: {
            fraction: joined(parts.slice(split)),
            whole: joined(parts.slice(0, split)),
        },
        once: joined(price(once)),
        zero: joined(price(0)),
        yearly: joined(price(yearly)),
    };
}

export function usPrices(language: Locale) {
    const { monthly, once, yearly } = proPrices(null, language);
    return { monthly: `${monthly.whole}${monthly.fraction}`, once, yearly };
}

import type { CurrencyInputLabels } from "panelui-web/currency-input";
import type { ExchangeLabels } from "panelui-web/exchange";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

const ENGLISH = "en-US";
const REGIONAL_FALLBACK = new Map([
    ["es", "es-419"],
    ["fr", "fr-FR"],
    ["de", "de-DE"],
    ["it", "it-IT"],
    ["ja", "ja-JP"],
    ["ko", "ko-KR"],
    ["nl", "nl-NL"],
    ["pt", "pt-BR"],
]);

export function numberLocale(language: string, browser: readonly string[]): string {
    if (language.includes("-")) {
        return language;
    }
    if (language === "en") {
        return ENGLISH;
    }
    const region = browser
        .map((tag) => new Intl.Locale(tag))
        .find((locale) => locale.language === language && locale.region)?.region;
    return region ? `${language}-${region}` : (REGIONAL_FALLBACK.get(language) ?? ENGLISH);
}

export function useNumberLocale(): string {
    const { locale: language } = useLocale();
    // No browser hint: the server renders with the cookie's locale, so both sides must agree.
    return useMemo(() => numberLocale(language, []), [language]);
}

export function useExchangeLocale(): {
    currencyLabels: CurrencyInputLabels;
    labels: ExchangeLabels;
    locale: string;
} {
    const { locale: language } = useLocale();
    const text = useIntlayer("exchange");
    return useMemo(
        () => ({
            currencyLabels: {
                amountIn: (name) => text.amountIn({ name }).value,
                changeCurrency: (name) => text.changeCurrency({ name }).value,
                close: text.close.value,
                currency: text.currency.value,
                unitIn: (name) => text.unitIn({ name }).value,
            },
            labels: {
                amountIn: (_label, name) => text.amountIn({ name }).value,
                changeCurrency: (name) => text.changeCurrency({ name }).value,
                close: text.close.value,
                convertFrom: text.convertFrom.value,
                convertTo: text.convertTo.value,
            },
            locale: numberLocale(language, navigator.languages),
        }),
        [language, text]
    );
}

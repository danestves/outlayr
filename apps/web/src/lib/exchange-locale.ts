import type { ExchangeLabels } from "panelui-web/exchange";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

const ENGLISH = "en-US";
const REGIONAL_FALLBACK = new Map([
    ["es", "es-419"],
    ["fr", "fr-FR"],
    ["pt", "pt-BR"],
]);

export function numberLocale(language: string, browser: readonly string[]): string {
    if (language === "en") {
        return ENGLISH;
    }
    const region = browser
        .map((tag) => new Intl.Locale(tag))
        .find((locale) => locale.language === language && locale.region)?.region;
    return region ? `${language}-${region}` : (REGIONAL_FALLBACK.get(language) ?? ENGLISH);
}

export function useExchangeLocale(): { labels: ExchangeLabels; locale: string } {
    const { locale: language } = useLocale();
    const text = useIntlayer("exchange");
    return useMemo(
        () => ({
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

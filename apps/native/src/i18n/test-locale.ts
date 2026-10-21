import type { Locale } from "expo-localization";

/** Test-only: a complete {@link Locale} for a `getLocales()` mock, with `overrides` over a US English device. */
export const testLocale = (overrides: Partial<Locale> = {}): Locale => ({
    currencyCode: "USD",
    currencySymbol: "$",
    decimalSeparator: ".",
    digitGroupingSeparator: ",",
    languageCode: "en",
    languageCurrencyCode: "USD",
    languageCurrencySymbol: "$",
    languageRegionCode: "US",
    languageScriptCode: null,
    languageTag: "en-US",
    measurementSystem: "us",
    regionCode: "US",
    temperatureUnit: "fahrenheit",
    textDirection: "ltr",
    ...overrides,
});

import { defaultLocale, getLocalizedUrl, getPrefix, isDeclaredLocale, locales, validatePrefix } from "intlayer";
import type { DeclaredLocales } from "intlayer";

import { SITE_URL } from "./site";

export type Locale = DeclaredLocales;

export const LANGUAGES = {
    en: { date: "en-GB", hreflang: "en", image: "/og.png", lang: "en", name: "English", og: "en_US" },
    es: { date: "es-419", hreflang: "es", image: "/og-es.png", lang: "es-419", name: "Español", og: "es_LA" },
    pt: { date: "pt-BR", hreflang: "pt", image: "/og.png", lang: "pt-BR", name: "Português", og: "pt_BR" },
    fr: { date: "fr-FR", hreflang: "fr", image: "/og.png", lang: "fr", name: "Français", og: "fr_FR" },
} as const satisfies Record<
    Locale,
    { date: string; hreflang: string; image: string; lang: string; name: string; og: string }
>;

export function localeFromParam(param: string | undefined): Locale {
    const { localePrefix } = validatePrefix(param);
    return isDeclaredLocale(localePrefix) ? localePrefix : defaultLocale;
}

export function pageUrl(path: string, locale: Locale): string {
    return `${SITE_URL}${getLocalizedUrl(path, locale)}`;
}

// Portuguese and French serve only the pages translated so far, so no English text sits under /pt or /fr.
const TOOL_PATHS = [
    "/tools",
    "/tools/50-30-20-budget-calculator",
    "/tools/installment-calculator",
    "/tools/split-expenses-calculator",
    "/tools/subscription-cost-calculator",
];

const PAGE_PATHS = [
    "/",
    "/support",
    "/privacy",
    "/terms",
    "/delete-account",
    "/guides",
    "/guides/expense-tracker-template",
    ...TOOL_PATHS,
];

export const TRANSLATED: Partial<Record<Locale, ReadonlySet<string>>> = {
    fr: new Set([...PAGE_PATHS, "/guides/best-budget-apps-france"]),
    pt: new Set([...PAGE_PATHS, "/guides/best-expense-tracker-apps-brazil"]),
};

const TRAILING_SLASH = /(?<=.)\/$/u;

export function isPublished(path: string, locale: Locale): boolean {
    return TRANSLATED[locale]?.has(path.replace(TRAILING_SLASH, "")) ?? true;
}

export function publishedLocales(path: string): Locale[] {
    return locales.filter((locale) => isPublished(path, locale));
}

export function linkPrefix(path: string, locale: Locale): string | undefined {
    return getPrefix(isPublished(path, locale) ? locale : defaultLocale).localePrefix;
}

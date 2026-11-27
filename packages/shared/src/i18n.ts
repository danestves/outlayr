import { defaultLocale, getLocalizedUrl, getPrefix, isDeclaredLocale, locales, validatePrefix } from "intlayer";
import type { DeclaredLocales } from "intlayer";

import { SITE_URL } from "./urls";

export type Locale = DeclaredLocales;

interface LanguageMeta {
    date: string;
    hreflang: string;
    image: string;
    lang: string;
    name: string;
    og: string;
}

type EuropeanLocale = "es-ES" | "pt-PT";
type BaseLocale = Exclude<Locale, EuropeanLocale>;

const BASE_LANGUAGES = {
    en: { date: "en-GB", hreflang: "en", image: "/og/en.png", lang: "en", name: "English", og: "en_US" },
    de: { date: "de-DE", hreflang: "de", image: "/og/de.png", lang: "de", name: "Deutsch", og: "de_DE" },
    es: { date: "es-419", hreflang: "es", image: "/og/es.png?v=2", lang: "es-419", name: "Español", og: "es_LA" },
    pt: { date: "pt-BR", hreflang: "pt", image: "/og/pt.png", lang: "pt-BR", name: "Português", og: "pt_BR" },
    fr: { date: "fr-FR", hreflang: "fr", image: "/og/fr.png", lang: "fr", name: "Français", og: "fr_FR" },
    it: { date: "it-IT", hreflang: "it", image: "/og/it.png", lang: "it", name: "Italiano", og: "it_IT" },
    nl: { date: "nl-NL", hreflang: "nl", image: "/og/nl.png", lang: "nl", name: "Nederlands", og: "nl_NL" },
    ja: { date: "ja-JP", hreflang: "ja", image: "/og/ja.png", lang: "ja", name: "日本語", og: "ja_JP" },
    ko: { date: "ko-KR", hreflang: "ko", image: "/og/ko.png", lang: "ko", name: "한국어", og: "ko_KR" },
} as const satisfies Record<BaseLocale, LanguageMeta>;

export const LANGUAGES = {
    ...BASE_LANGUAGES,
    "es-ES": {
        date: "es-ES",
        hreflang: "es-ES",
        image: "/og/es.png?v=2",
        lang: "es-ES",
        name: "Español (España)",
        og: "es_ES",
    },
    "pt-PT": {
        date: "pt-PT",
        hreflang: "pt-PT",
        image: "/og/pt.png",
        lang: "pt-PT",
        name: "Português (Portugal)",
        og: "pt_PT",
    },
} as const satisfies Record<BaseLocale | EuropeanLocale, LanguageMeta>;

export function localeFromParam(param: string | undefined): Locale {
    const { localePrefix } = validatePrefix(param);
    return isDeclaredLocale(localePrefix) ? localePrefix : defaultLocale;
}

function baseLocale(locale: Locale): Locale {
    const [primary = locale] = locale.split("-");
    return isDeclaredLocale(primary) ? primary : locale;
}

export function pageUrl(path: string, locale: Locale, origin: string = SITE_URL): string {
    return `${origin}${getLocalizedUrl(path, locale)}`;
}

export function sitePageUrl(path: string, locale: Locale): string {
    const [pathname = "/", hash] = path.split("#");
    const siteLocale = baseLocale(locale);
    const prefix = siteLocale === defaultLocale || !isPublished(pathname, siteLocale) ? "" : `/${siteLocale}`;
    const localized = prefix && pathname === "/" ? prefix : `${prefix}${pathname}`;
    return `${SITE_URL}${localized}${hash === undefined ? "" : `#${hash}`}`;
}

// Every language but English and Spanish serves only its translated pages, so no English sits under its prefix.
const TOOL_PATHS = [
    "/tools",
    "/tools/50-30-20-budget-calculator",
    "/tools/installment-calculator",
    "/tools/split-expenses-calculator",
    "/tools/subscription-cost-calculator",
];

const COMPARE_PATHS = [
    "/compare",
    "/compare/copilot",
    "/compare/everydollar",
    "/compare/fintonic",
    "/compare/goodbudget",
    "/compare/monarch",
    "/compare/monefy",
    "/compare/money-lover",
    "/compare/pocketguard",
    "/compare/rocket-money",
    "/compare/spendee",
    "/compare/wallet",
    "/compare/ynab",
];

const PAGE_PATHS = [
    "/",
    "/pricing",
    "/about",
    "/brand",
    ...COMPARE_PATHS,
    "/open",
    "/support",
    "/privacy",
    "/terms",
    "/delete-account",
    "/guides",
    "/guides/expense-tracker-template",
    ...TOOL_PATHS,
];

export const TRANSLATED: Partial<Record<Locale, ReadonlySet<string>>> = {
    de: new Set(PAGE_PATHS),
    fr: new Set([...PAGE_PATHS, "/guides/best-budget-apps-canada", "/guides/best-budget-apps-france"]),
    pt: new Set([...PAGE_PATHS, "/guides/best-expense-tracker-apps-brazil"]),
    it: new Set(),
    nl: new Set(),
    ja: new Set(),
    ko: new Set(),
};

const TRAILING_SLASH = /(?<=.)\/$/u;

export function isPublished(path: string, locale: Locale): boolean {
    return TRANSLATED[locale]?.has(path.replace(TRAILING_SLASH, "")) ?? true;
}

// Their searchers write in Spanish, so hreflang x-default sends unmatched languages to the Spanish page.
const SPANISH_FIRST: ReadonlySet<string> = new Set([
    "/guides/how-to-pay-cashea",
    "/tools/dolar-bcv-hoy",
    "/tools/dolar-hoy-argentina",
    "/tools/dolar-hoy-bolivia",
]);

export function fallbackLocale(path: string): Locale {
    return SPANISH_FIRST.has(path.replace(TRAILING_SLASH, "")) ? "es" : defaultLocale;
}

export function publishedLocales(path: string): Locale[] {
    return locales.filter((locale) => isPublished(path, locale));
}

export function linkPrefix(path: string, locale: Locale): string | undefined {
    return getPrefix(isPublished(path, locale) ? locale : defaultLocale).localePrefix;
}

import { getIntlayer } from "intlayer";
import type { JSX } from "react";

import { LANGUAGES, pageUrl } from "./i18n";
import type { Locale } from "./i18n";
import { LEGAL_DAYS, PLAY_STORE_URL, SITE_URL, SOURCE_URL, X_URL } from "./site";

type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json | undefined };

export function pageMeta(title: string, description: string): JSX.IntrinsicElements["meta"][] {
    return [
        { title },
        { content: description, name: "description" },
        { content: title, property: "og:title" },
        { content: description, property: "og:description" },
    ];
}

export function faqPage(items: readonly { answer: string; question: string }[], inLanguage: string) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage,
        mainEntity: items.map((item) => ({
            "@type": "Question",
            acceptedAnswer: { "@type": "Answer", text: item.answer },
            name: item.question,
        })),
    };
}

export function ldJson(data: Json) {
    return { children: JSON.stringify(data).replaceAll("<", "\\u003c"), type: "application/ld+json" };
}

const TRAILING_PERIOD = /\.$/u;

export function answerTrail(locale: Locale, hub: "compare" | "guides" | "tools", slug: string, title: string) {
    const crumbs = [
        { name: "Outlayr", url: pageUrl("/", locale) },
        { name: getIntlayer("site", locale).footer[hub], url: pageUrl(`/${hub}`, locale) },
        { name: title.replace(TRAILING_PERIOD, ""), url: pageUrl(`/${hub}/${slug}`, locale) },
    ];
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            item: crumb.url,
            name: crumb.name,
            position: index + 1,
        })),
    };
}

export function itemList(items: readonly { name: string; url: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            name: item.name,
            position: index + 1,
            url: item.url,
        })),
    };
}

export const APP_ID = `${SITE_URL}/#app`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const FOUNDER_ID = `${SITE_URL}/about#daniel-esteves`;

function billed(price: string, billingDuration: string) {
    return { "@type": "UnitPriceSpecification", billingDuration, price, priceCurrency: "USD" };
}

const PRO_OFFERS = [
    { name: "Outlayr Pro, monthly", price: "7.99", priceSpecification: billed("7.99", "P1M") },
    { name: "Outlayr Pro, yearly", price: "49.99", priceSpecification: billed("49.99", "P1Y") },
    { name: "Outlayr Pro, once", price: "129.99" },
];

function offers(locale: Locale) {
    const url = `${pageUrl("/", locale)}#pricing`;
    return [
        { "@type": "Offer", name: "Outlayr", price: "0", priceCurrency: "USD" },
        ...PRO_OFFERS.map((offer) => ({ "@type": "Offer", priceCurrency: "USD", url, ...offer })),
    ];
}

export function mobileApp(locale: Locale, description: string, fields: { readonly [key: string]: Json } = {}) {
    return {
        "@id": APP_ID,
        "@type": "MobileApplication",
        applicationCategory: "FinanceApplication",
        description,
        downloadUrl: [PLAY_STORE_URL],
        inLanguage: Object.values(LANGUAGES).map((language) => language.lang),
        name: "Outlayr",
        offers: offers(locale),
        operatingSystem: "Android",
        publisher: { "@id": ORGANIZATION_ID },
        sameAs: [PLAY_STORE_URL, X_URL, SOURCE_URL],
        url: pageUrl("/", locale),
        ...fields,
    };
}

export function legalPage(locale: Locale, slug: keyof typeof LEGAL_DAYS, name: string) {
    return webPage(locale, `/${slug}`, {
        dateModified: LEGAL_DAYS[slug].toISOString().slice(0, 10),
        name,
        publisher: { "@id": ORGANIZATION_ID },
    });
}

export function webPage(locale: Locale, path: string, fields: { readonly [key: string]: Json }) {
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        inLanguage: LANGUAGES[locale].lang,
        isPartOf: { "@id": WEBSITE_ID },
        url: pageUrl(path, locale),
        ...fields,
    };
}

export function hubTrail(locale: Locale, hub: "compare" | "guides" | "tools") {
    const crumbs = [
        { name: "Outlayr", url: pageUrl("/", locale) },
        { name: getIntlayer("site", locale).footer[hub], url: pageUrl(`/${hub}`, locale) },
    ];
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            item: crumb.url,
            name: crumb.name,
            position: index + 1,
        })),
    };
}

export function article(
    locale: Locale,
    path: string,
    { dateModified, description, headline }: { dateModified: Date; description: string; headline: string }
) {
    const url = pageUrl(path, locale);
    return {
        "@context": "https://schema.org",
        "@id": `${url}#article`,
        "@type": "Article",
        author: { "@id": FOUNDER_ID },
        dateModified: dateModified.toISOString().slice(0, 10),
        description,
        headline: headline.replace(TRAILING_PERIOD, ""),
        image: `${SITE_URL}${LANGUAGES[locale].image}`,
        inLanguage: LANGUAGES[locale].lang,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntityOfPage: { "@id": url, "@type": "WebPage" },
        publisher: { "@id": ORGANIZATION_ID },
    };
}

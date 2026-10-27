import geist from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { HeadContent, Scripts, createRootRoute, useMatches, useParams } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import * as Effect from "effect/Effect";
import { defaultLocale, getIntlayer, getPathWithoutLocale, locales } from "intlayer";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { IntlayerProvider } from "react-intlayer";

import { ConsentBanner } from "@/components/consent-banner";
import { NotFound } from "@/components/not-found";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAgentTools } from "@/lib/agent-tools";
import { startAnalytics } from "@/lib/analytics";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { startMotion } from "@/lib/motion";
import { APP_ID, FOUNDER_ID, ORGANIZATION_ID, WEBSITE_ID, ldJson, mobileApp } from "@/lib/seo";
import { COMPANY, FOUNDER, SITE_URL, SOURCE_URL, SUPPORT_EMAIL, X_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";

import appCss from "../index.css?url";

const visitorCountry = createServerFn({ method: "GET" }).handler(() => getRequestHeader("cf-ipcountry") ?? null);

const ORGANIZATION_NOTE = `Outlayr is an expense tracker app made by ${COMPANY}. It is not affiliated with Outlayr, Inc., a payments company at outlayr.com.`;

function siteGraph(locale: Locale) {
    const { extras, meta } = getIntlayer("home", locale);
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@id": ORGANIZATION_ID,
                "@type": "Organization",
                address: {
                    "@type": "PostalAddress",
                    addressCountry: "US",
                    addressLocality: "Middletown",
                    addressRegion: "DE",
                    postalCode: "19709",
                    streetAddress: "651 N Broad St, Suite 201",
                },
                brand: { "@type": "Brand", name: "Outlayr" },
                contactPoint: {
                    "@type": "ContactPoint",
                    availableLanguage: Object.values(LANGUAGES).map((language) => language.lang),
                    contactType: "customer support",
                    email: SUPPORT_EMAIL,
                },
                disambiguatingDescription: ORGANIZATION_NOTE,
                email: SUPPORT_EMAIL,
                founder: { "@id": FOUNDER_ID },
                legalName: COMPANY,
                logo: `${SITE_URL}/apple-touch-icon.png`,
                name: "Outlayr",
                sameAs: [X_URL, SOURCE_URL],
                url: SITE_URL,
            },
            {
                "@id": FOUNDER_ID,
                "@type": "Person",
                image: `${SITE_URL}${FOUNDER.image}`,
                jobTitle: "Founder and developer",
                name: "Daniel Esteves",
                sameAs: [FOUNDER.github, FOUNDER.x, FOUNDER.website],
                url: `${SITE_URL}/about#maker`,
                worksFor: { "@id": ORGANIZATION_ID },
            },
            {
                "@id": WEBSITE_ID,
                "@type": "WebSite",
                inLanguage: Object.values(LANGUAGES).map((language) => language.lang),
                name: "Outlayr",
                publisher: { "@id": ORGANIZATION_ID },
                url: SITE_URL,
            },
            {
                "@id": `${SITE_URL}/#source`,
                "@type": "SoftwareSourceCode",
                codeRepository: SOURCE_URL,
                description:
                    "The source code of Outlayr: the Expo and React Native app for iPhone and Android, under GPL-3.0, and its Convex server, under AGPL-3.0.",
                license: ["https://www.gnu.org/licenses/gpl-3.0.html", "https://www.gnu.org/licenses/agpl-3.0.html"],
                name: "Outlayr",
                programmingLanguage: "TypeScript",
                publisher: { "@id": ORGANIZATION_ID },
                targetProduct: { "@id": APP_ID },
            },
            mobileApp(locale, meta.description, {
                featureList: extras.map((extra) => `${extra.label}: ${extra.text}`),
                image: `${SITE_URL}${LANGUAGES[locale].image}`,
            }),
        ],
    };
}

export const Route = createRootRoute({
    head: ({ matches }) => {
        const leaf = matches.at(-1);
        const params: { locale?: string } = leaf?.params ?? {};
        const locale = localeFromParam(params.locale);
        const path = getPathWithoutLocale(leaf?.pathname ?? "/");
        const found = matches.every((match) => match.status === "success" && !match._notFound);
        const { hero, meta } = getIntlayer("home", locale);
        const { notFound } = getIntlayer("site", locale);
        return {
            links: [
                ...(found
                    ? [
                          { href: pageUrl(path, locale), rel: "canonical" },
                          ...locales.map((alternate) => ({
                              href: pageUrl(path, alternate),
                              hrefLang: LANGUAGES[alternate].hreflang,
                              rel: "alternate",
                          })),
                          { href: pageUrl(path, defaultLocale), hrefLang: "x-default", rel: "alternate" },
                      ]
                    : []),
                { href: appCss, rel: "stylesheet" },
                // The latin face the first paint sets, fetched with the CSS instead of after it.
                { as: "font", crossOrigin: "anonymous", href: geist, rel: "preload", type: "font/woff2" },
                { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
                {
                    href: "/favicon-light.png",
                    media: "(prefers-color-scheme: light)",
                    rel: "icon",
                    sizes: "96x96",
                    type: "image/png",
                },
                {
                    href: "/favicon-dark.png",
                    media: "(prefers-color-scheme: dark)",
                    rel: "icon",
                    sizes: "96x96",
                    type: "image/png",
                },
                { href: "/apple-touch-icon.png", rel: "apple-touch-icon" },
            ],
            meta: [
                { charSet: "utf-8" },
                { content: "width=device-width, initial-scale=1", name: "viewport" },
                ...(found ? [] : [{ title: `${notFound.meta} · Outlayr` }]),
                { content: "max-image-preview:large", name: "robots" },
                { content: "#ffffff", name: "theme-color" },
                { content: "Outlayr", property: "og:site_name" },
                { content: "website", property: "og:type" },
                { content: LANGUAGES[locale].og, property: "og:locale" },
                ...locales
                    .filter((alternate) => alternate !== locale)
                    .map((alternate) => ({ content: LANGUAGES[alternate].og, property: "og:locale:alternate" })),
                { content: meta.title, property: "og:title" },
                { content: meta.description, property: "og:description" },
                { content: pageUrl(path, locale), property: "og:url" },
                { content: `${SITE_URL}${LANGUAGES[locale].image}`, property: "og:image" },
                { content: "1200", property: "og:image:width" },
                { content: "630", property: "og:image:height" },
                { content: `Outlayr. ${hero.title}`, property: "og:image:alt" },
                { content: "summary_large_image", name: "twitter:card" },
                { content: "@tryoutlayr", name: "twitter:site" },
                { content: "app-id=6801652978", name: "apple-itunes-app" },
            ],
            scripts: [{ children: THEME_SCRIPT }, ldJson(siteGraph(locale))],
        };
    },
    loader: () => visitorCountry(),
    notFoundComponent: NotFound,
    shellComponent: RootDocument,
    staleTime: Number.POSITIVE_INFINITY,
});

function RootDocument({ children }: { children: ReactNode }) {
    const locale = localeFromParam(useParams({ strict: false }).locale);
    const country = Route.useLoaderData();
    const inAccount = useMatches({ select: (matches) => matches.some((match) => match.routeId === "/_account") });
    // oxlint-disable-next-line outlayr/react-effect-budget -- starts the analytics SDK once after hydration, with the visitor's country
    useEffect(() => {
        Effect.runFork(startAnalytics(country).pipe(Effect.ignoreCause));
    }, [country]);
    useAgentTools(locale);
    return (
        <html lang={LANGUAGES[locale].lang} suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body className="flex min-h-dvh flex-col" ref={startMotion}>
                <IntlayerProvider locale={locale}>
                    {inAccount ? null : <SiteHeader />}
                    <div className="flex-1">{children}</div>
                    {inAccount ? null : <SiteFooter />}
                    <ConsentBanner />
                </IntlayerProvider>
                <Scripts />
            </body>
        </html>
    );
}

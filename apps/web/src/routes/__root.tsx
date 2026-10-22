import geistMono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import geist from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { HeadContent, Scripts, createRootRoute, useParams } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
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
import { useMotion } from "@/lib/motion";
import { APP_ID, ORGANIZATION_ID, WEBSITE_ID, ldJson } from "@/lib/seo";
import { COMPANY, SITE_URL, SOURCE_URL, SUPPORT_EMAIL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";

import appCss from "../index.css?url";

const visitorCountry = createServerFn({ method: "GET" }).handler(() => getRequestHeader("cf-ipcountry") ?? null);

const SITE_GRAPH = {
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
            email: SUPPORT_EMAIL,
            logo: `${SITE_URL}/apple-touch-icon.png`,
            name: COMPANY,
            url: SITE_URL,
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
    ],
};

export const Route = createRootRoute({
    head: ({ matches }) => {
        const leaf = matches.at(-1);
        const params: { locale?: string } = leaf?.params ?? {};
        const locale = localeFromParam(params.locale);
        const path = getPathWithoutLocale(leaf?.pathname ?? "/");
        const found = matches.every((match) => match.status === "success" && !match._notFound);
        const { hero, meta } = getIntlayer("home", locale);
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
                // The latin faces the first paint sets, fetched with the CSS instead of after it.
                ...[geist, geistMono].map((href) => ({
                    as: "font",
                    crossOrigin: "anonymous" as const,
                    href,
                    rel: "preload",
                    type: "font/woff2",
                })),
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
            scripts: [{ children: THEME_SCRIPT }, ldJson(SITE_GRAPH)],
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
    useEffect(() => {
        startAnalytics(country).catch(() => undefined);
    }, [country]);
    useAgentTools(locale);
    useMotion();
    return (
        <html lang={LANGUAGES[locale].lang} suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body className="flex min-h-dvh flex-col">
                <IntlayerProvider locale={locale}>
                    <SiteHeader />
                    <div className="flex-1">{children}</div>
                    <SiteFooter />
                    <ConsentBanner />
                </IntlayerProvider>
                <Scripts />
            </body>
        </html>
    );
}

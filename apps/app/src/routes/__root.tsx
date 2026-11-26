import type { ConvexQueryClient } from "@convex-dev/react-query";
import geist from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { startAnalytics } from "@outlayr/shared/analytics";
import { LANGUAGES } from "@outlayr/shared/i18n";
import { useLayoutMirror, useMirror, useOnMount } from "@outlayr/shared/lifecycle";
import { THEME_SCRIPT, paintTheme, readTheme } from "@outlayr/shared/theme";
import type { DbClient } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import * as Effect from "effect/Effect";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { IntlayerProvider } from "react-intlayer";

import { AppConsentBanner } from "@/components/consent-banner";
import { NotFound } from "@/components/not-found";
import { ENV } from "@/env";
import { convexUrlsScript } from "@/lib/convex";
import {
    migrateDashboardLocale,
    readDashboardLocale,
    requestDashboardLocale,
    subscribeDashboardLocale,
} from "@/lib/dashboard-locale";
import type { Session } from "@/lib/session";

import appCss from "../index.css?url";

const ANALYTICS_TOKEN = import.meta.env.PROD ? ENV.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN : undefined;

const visitorCountry = createServerFn({ method: "GET" }).handler(() => getRequestHeader("cf-ipcountry") ?? null);

export const Route = createRootRouteWithContext<{
    convexQueryClient: ConvexQueryClient | undefined;
    dbClient: DbClient;
    queryClient: QueryClient;
    session: Session;
}>()({
    head: () => ({
        links: [
            { href: appCss, rel: "stylesheet" },
            { as: "font", crossOrigin: "anonymous", href: geist, rel: "preload", type: "font/woff2" },
            { href: "/manifest.webmanifest", rel: "manifest" },
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
            { title: "Outlayr" },
            { content: "noindex", name: "robots" },
            { content: "#ffffff", name: "theme-color" },
        ],
        scripts: [{ children: THEME_SCRIPT }, { children: convexUrlsScript() }],
    }),
    loader: async () => ({ country: await visitorCountry(), locale: requestDashboardLocale() }),
    notFoundComponent: NotFound,
    shellComponent: RootDocument,
    staleTime: Number.POSITIVE_INFINITY,
});

function RootDocument({ children }: { children: ReactNode }) {
    const { country, locale: requestLocale } = Route.useLoaderData();
    const locale = useSyncExternalStore(
        subscribeDashboardLocale,
        () => readDashboardLocale(requestLocale),
        () => requestLocale
    );
    useOnMount(() => {
        migrateDashboardLocale();
        return () => undefined;
    });
    useMirror([country], () => {
        Effect.runFork(
            startAnalytics(ANALYTICS_TOKEN, country, { cross_subdomain_cookie: false, persistence_name: "app" }).pipe(
                Effect.ignoreCause
            )
        );
    });
    // A hydration that falls back to a client render strips what THEME_SCRIPT stamped on <html>.
    useLayoutMirror([], () => {
        document.documentElement.classList.add("js");
        paintTheme(readTheme());
    });
    return (
        <html lang={LANGUAGES[locale].lang} suppressHydrationWarning>
            <head>
                <meta content="#131209" media="(prefers-color-scheme: dark)" name="theme-color" />
                <HeadContent />
            </head>
            <body className="flex min-h-dvh flex-col">
                <IntlayerProvider locale={locale}>
                    <div className="flex-1">{children}</div>
                    <AppConsentBanner />
                </IntlayerProvider>
                <Scripts />
            </body>
        </html>
    );
}

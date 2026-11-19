import { createIsomorphicFn } from "@tanstack/react-start";
import { ConvexReactClient } from "convex/react";

import { ENV } from "@/env";

interface ConfiguredUrls {
    readonly convexSiteUrl: string | undefined;
    readonly convexUrl: string | undefined;
}

declare global {
    interface Window {
        __OUTLAYR_CONVEX__?: ConfiguredUrls;
    }
}

// The published Docker image bakes no URL, so its server reads them at boot and hands them to the browser.
const configuredUrls = createIsomorphicFn()
    .server((): ConfiguredUrls => ({
        convexSiteUrl: ENV.VITE_CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL,
        convexUrl: ENV.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL,
    }))
    .client(
        (): ConfiguredUrls =>
            window.__OUTLAYR_CONVEX__ ?? { convexSiteUrl: ENV.VITE_CONVEX_SITE_URL, convexUrl: ENV.VITE_CONVEX_URL }
    );

export const convexConfigured = () => configuredUrls().convexUrl !== undefined;

export const convexUrlsScript = () =>
    `window.__OUTLAYR_CONVEX__=${JSON.stringify(configuredUrls()).replaceAll("<", "\\u003c")}`;

export function convexUrls() {
    const { convexSiteUrl, convexUrl } = configuredUrls();
    if (!convexUrl || !convexSiteUrl) {
        throw new Error(
            "Set VITE_CONVEX_URL and VITE_CONVEX_SITE_URL in apps/app/.env.local to use /login and /connect."
        );
    }
    return { convexSiteUrl, convexUrl };
}

export const serverConvexUrl = createIsomorphicFn()
    .server(() => ENV.CONVEX_INTERNAL_URL ?? process.env.CONVEX_INTERNAL_URL ?? convexUrls().convexUrl)
    .client(() => convexUrls().convexUrl);

let client: ConvexReactClient | undefined;

export function convexClient() {
    client ??= new ConvexReactClient(convexUrls().convexUrl, { expectAuth: true });
    return client;
}

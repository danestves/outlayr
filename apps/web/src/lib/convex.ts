import { ConvexReactClient } from "convex/react";

export function convexUrls() {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
    if (!convexUrl || !convexSiteUrl) {
        throw new Error(
            "Set VITE_CONVEX_URL and VITE_CONVEX_SITE_URL in apps/web/.env.local to use /login and /connect."
        );
    }
    return { convexSiteUrl, convexUrl };
}

let client: ConvexReactClient | undefined;

export function convexClient() {
    client ??= new ConvexReactClient(convexUrls().convexUrl, { expectAuth: true });
    return client;
}

import { ConvexReactClient } from "convex/react";

import { ENV } from "@/env";

export function convexUrls() {
    const convexUrl = ENV.VITE_CONVEX_URL;
    const convexSiteUrl = ENV.VITE_CONVEX_SITE_URL;
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

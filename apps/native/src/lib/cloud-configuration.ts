import { ENV } from "@/env";

const TAB_OR_NEWLINE = /[\t\n\r]/g;

export type CloudConfiguration = "configured" | "misconfigured" | "unconfigured";

export function readConvexUrl(key: string, raw: string | undefined, exampleHost: string): string | undefined {
    if (raw === undefined || raw === "") {
        return undefined;
    }
    const url = raw.trim().replaceAll(TAB_OR_NEWLINE, "");
    const hostname = URL.parse(url)?.hostname;
    if (hostname === undefined) {
        throw new Error(`${key}: Invalid URL`);
    }
    if (hostname === exampleHost) {
        throw new Error(`${key}: Replace the ${exampleHost} placeholder before running the app`);
    }
    return url;
}

export const CONVEX_URL = readConvexUrl("EXPO_PUBLIC_CONVEX_URL", ENV.EXPO_PUBLIC_CONVEX_URL, "example.convex.cloud");
export const CONVEX_SITE_URL = readConvexUrl(
    "EXPO_PUBLIC_CONVEX_SITE_URL",
    ENV.EXPO_PUBLIC_CONVEX_SITE_URL,
    "example.convex.site"
);

export function cloudConfiguration({
    convexSiteUrl = CONVEX_SITE_URL,
    convexUrl = CONVEX_URL,
}: {
    convexSiteUrl?: string;
    convexUrl?: string;
} = {}): CloudConfiguration {
    if (convexSiteUrl && convexUrl) {
        return "configured";
    }
    return convexSiteUrl || convexUrl ? "misconfigured" : "unconfigured";
}

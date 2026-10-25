import { createEnv } from "@t3-oss/env-core";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

const TAB_OR_NEWLINE = /[\t\n\r]/g;

const optionalString = Schema.toStandardSchemaV1(Schema.UndefinedOr(Schema.String));

const convexUrlSchema = (exampleHost: string) =>
    Schema.toStandardSchemaV1(
        Schema.UndefinedOr(
            Schema.String.pipe(
                Schema.decodeTo(
                    Schema.String.check(
                        Schema.makeFilter((url) => {
                            const hostname = URL.parse(url)?.hostname;
                            if (hostname === undefined) {
                                return "Invalid URL";
                            }
                            return (
                                hostname !== exampleHost ||
                                `Replace the ${exampleHost} placeholder before running the app`
                            );
                        })
                    ),
                    SchemaTransformation.transform({
                        decode: (url) => url.trim().replace(TAB_OR_NEWLINE, ""),
                        encode: (url) => url,
                    })
                )
            )
        )
    );

export const env = createEnv({
    client: {
        EXPO_PUBLIC_CONVEX_SITE_URL: convexUrlSchema("example.convex.site"),
        EXPO_PUBLIC_CONVEX_URL: convexUrlSchema("example.convex.cloud"),
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: optionalString,
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: optionalString,
        EXPO_PUBLIC_LOGO_DEV_TOKEN: optionalString,
        EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN: optionalString,
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: optionalString,
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: optionalString,
    },
    clientPrefix: "EXPO_PUBLIC_",
    emptyStringAsUndefined: true,
    runtimeEnv: {
        EXPO_PUBLIC_CONVEX_SITE_URL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
        EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
        EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
        EXPO_PUBLIC_LOGO_DEV_TOKEN: process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN,
        EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    },
});

export type CloudConfiguration = "configured" | "misconfigured" | "unconfigured";

export function cloudConfiguration({
    convexSiteUrl = env.EXPO_PUBLIC_CONVEX_SITE_URL,
    convexUrl = env.EXPO_PUBLIC_CONVEX_URL,
}: {
    convexSiteUrl?: string;
    convexUrl?: string;
} = {}): CloudConfiguration {
    if (convexSiteUrl && convexUrl) {
        return "configured";
    }
    return convexSiteUrl || convexUrl ? "misconfigured" : "unconfigured";
}

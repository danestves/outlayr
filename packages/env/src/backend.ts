import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// All optional: a required var would fail the whole deployment over one provider; `auth.ts` degrades each on its own.
export const env = createEnv({
    emptyStringAsUndefined: true,
    // env-core's `typeof window` check treats convex-test's edge-runtime as a client and blocks server-var reads.
    isServer: true,
    runtimeEnv: process.env,
    server: {
        APPLE_CLIENT_ID: z.string().optional(),
        APPLE_KEY_ID: z.string().optional(),
        APPLE_PRIVATE_KEY: z.string().optional(),
        APPLE_TEAM_ID: z.string().optional(),
        APPLE_WEB_CLIENT_ID: z.string().optional(),
        CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
        CLOUDFLARE_EMAIL_TOKEN: z.string().optional(),
        EMAIL_FROM: z.string().optional(),
        GOOGLE_CLIENT_ID_IOS: z.string().optional(),
        GOOGLE_CLIENT_ID_WEB: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        POSTHOG_PERSONAL_API_KEY: z.string().optional(),
        POSTHOG_PROJECT_ID: z.string().optional(),
        REVENUECAT_SECRET_KEY: z.string().optional(),
        REVENUECAT_WEBHOOK_AUTH: z.string().min(32).optional(),
    },
});

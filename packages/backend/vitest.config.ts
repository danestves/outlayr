import { defineConfig } from "vite-plus";

export default defineConfig({
    test: {
        allowOnly: false,
        env: {
            CLOUDFLARE_ACCOUNT_ID: "test-cloudflare-account",
            CLOUDFLARE_EMAIL_TOKEN: "test-cloudflare-email-token",
            COTIZAVE_API_KEY: "test-cotizave-key",
            EMAIL_FROM: "no-reply@tryoutlayr.com",
            NATIVE_APP_URL: "outlayr://",
            POSTHOG_PERSONAL_API_KEY: "test-posthog-personal-api-key",
            POSTHOG_PROJECT_ID: "12345",
            REVENUECAT_SECRET_KEY: "test-revenuecat-secret-key",
            REVENUECAT_WEBHOOK_AUTH: "test-revenuecat-webhook-secret-0123456789",
            SITE_URL: "http://localhost:3000",
            TZ: "UTC",
        },
        // `convex-test` runs functions in a Convex-like runtime, not Node.
        environment: "edge-runtime",
    },
});

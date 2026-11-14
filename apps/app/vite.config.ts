import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { redact } from "@tanstack/redact/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { intlayer } from "vite-intlayer";
import { defineConfig } from "vite-plus";

const SECURITY_HEADERS = {
    "content-security-policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
    "permissions-policy": "camera=(), geolocation=(), microphone=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
};
const UNFRAMEABLE = {
    headers: {
        ...SECURITY_HEADERS,
        "content-security-policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    },
};
const A_DAY = { headers: { "cache-control": "public, max-age=86400" } };
const PUBLIC_FILE_RULES = {
    // Every file under /assets is content-hashed by Vite, so a URL never changes meaning.
    "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
    "/apple-touch-icon.png": A_DAY,
    "/budgets/**": A_DAY,
    "/favicon-dark.png": A_DAY,
    "/favicon-light.png": A_DAY,
    "/favicon.ico": A_DAY,
    "/favicon.svg": A_DAY,
    "/goals/**": A_DAY,
    "/onboarding-dark.webp": A_DAY,
    "/onboarding-light.webp": A_DAY,
    "/paywall-locked-light.svg": A_DAY,
    "/paywall-locked.svg": A_DAY,
    "/paywall-terrain-light.svg": A_DAY,
    "/paywall-terrain.svg": A_DAY,
    "/robots.txt": A_DAY,
};

export default defineConfig({
    plugins: [
        varlockVitePlugin({ ssrInjectMode: "resolved-env" }),
        tailwindcss(),
        intlayer(),
        tanstackStart({
            router: {
                codeSplittingOptions: {
                    splitBehavior: ({ routeId }) =>
                        routeId === "/_account/_app"
                            ? [
                                  ["component"],
                                  ["loader"],
                                  ["pendingComponent"],
                                  ["errorComponent"],
                                  ["notFoundComponent"],
                              ]
                            : undefined,
                },
            },
        }),
        nitro({
            routeRules: {
                "/**": { headers: SECURITY_HEADERS },
                "/connect": UNFRAMEABLE,
                "/login": UNFRAMEABLE,
                ...PUBLIC_FILE_RULES,
            },
            // A file requested before its deploy is live would 404 with these cache headers, and Cloudflare keeps it.
            routes: Object.fromEntries(
                Object.keys(PUBLIC_FILE_RULES).map((path) => [path, "./src/server/missing-asset.ts"])
            ),
        }),
        viteReact(),
        redact(),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3002,
    },
    ssr: {
        // Redact can only swap the React imports of server dependencies Vite bundles.
        noExternal: true,
        // CommonJS without React, which the dev SSR module runner cannot evaluate inline.
        external: ["@opentelemetry/semantic-conventions"],
    },
});

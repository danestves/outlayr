import contentCollections from "@content-collections/vite";
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
const LOADER_SPLIT_ROUTES = new Set([
    "/{-$locale}/compare/",
    "/{-$locale}/compare/$slug",
    "/{-$locale}/guides/",
    "/{-$locale}/guides/$slug",
    "/{-$locale}/tools/",
    "/{-$locale}/tools/$slug",
]);
const AN_HOUR = { headers: { "cache-control": "public, max-age=3600" } };
const A_DAY = { headers: { "cache-control": "public, max-age=86400" } };
const A_YEAR = { headers: { "cache-control": "public, max-age=31536000" } };
const PUBLIC_FILE_RULES = {
    // Every file under /assets is content-hashed by Vite, so a URL never changes meaning.
    "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
    "/media/iphone.webp": A_YEAR,
    "/media/iphone-500.webp": A_YEAR,
    "/media/logos/**": A_YEAR,
    "/apple-touch-icon.png": A_DAY,
    "/brand-kit/**": A_DAY,
    "/badges/**": A_YEAR,
    "/favicon-dark.png": A_DAY,
    "/favicon-light.png": A_DAY,
    "/favicon.ico": A_DAY,
    "/favicon.svg": A_DAY,
    "/films/logos/**": A_YEAR,
    "/llms.txt": AN_HOUR,
    "/og-es.png": A_DAY,
    "/og.png": A_DAY,
    "/robots.txt": AN_HOUR,
    "/screens/**": A_DAY,
    "/templates/**": A_DAY,
};

export default defineConfig({
    plugins: [
        varlockVitePlugin({ ssrInjectMode: "resolved-env" }),
        contentCollections(),
        tailwindcss(),
        intlayer(),
        tanstackStart({
            router: {
                codeSplittingOptions: {
                    splitBehavior: ({ routeId }) =>
                        LOADER_SPLIT_ROUTES.has(routeId)
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
        port: 3001,
    },
    ssr: {
        // Redact can only swap the React imports of server dependencies Vite bundles.
        noExternal: true,
        // CommonJS without React, which the dev SSR module runner cannot evaluate inline.
        external: ["@opentelemetry/semantic-conventions", "partial-json"],
    },
});

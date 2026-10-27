import contentCollections from "@content-collections/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
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
const AN_HOUR = { headers: { "cache-control": "public, max-age=3600" } };
const A_DAY = { headers: { "cache-control": "public, max-age=86400" } };

export default defineConfig({
    plugins: [
        contentCollections(),
        tailwindcss(),
        intlayer(),
        tanstackStart(),
        nitro({
            routeRules: {
                "/**": { headers: SECURITY_HEADERS },
                "/connect": UNFRAMEABLE,
                "/login": UNFRAMEABLE,
                // Every file under /assets is content-hashed by Vite, so a URL never changes meaning.
                "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
                "/app/**": A_DAY,
                "/apple-touch-icon.png": A_DAY,
                "/badges/**": A_DAY,
                "/favicon-dark.png": A_DAY,
                "/favicon-light.png": A_DAY,
                "/favicon.ico": A_DAY,
                "/favicon.svg": A_DAY,
                "/llms.txt": AN_HOUR,
                "/og-es.png": A_DAY,
                "/og.png": A_DAY,
                "/robots.txt": AN_HOUR,
                "/screens/**": A_DAY,
                "/templates/**": A_DAY,
            },
            routes: { "/assets/**": "./src/server/missing-asset.ts" },
        }),
        viteReact(),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3001,
    },
    ssr: {
        noExternal: ["@convex-dev/better-auth"],
    },
});

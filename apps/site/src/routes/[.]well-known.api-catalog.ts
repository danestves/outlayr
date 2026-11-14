import { createFileRoute } from "@tanstack/react-router";

import { LEDGER_MCP_ORIGIN, SITE_URL } from "@/lib/site";

const catalog = {
    linkset: [
        {
            anchor: `${SITE_URL}/`,
            item: [
                { href: `${SITE_URL}/openapi.json`, type: "application/json" },
                { href: `${SITE_URL}/mcp`, type: "application/json" },
                { href: `${LEDGER_MCP_ORIGIN}/mcp`, type: "application/json" },
            ],
            "service-desc": [{ href: `${SITE_URL}/openapi.json`, type: "application/json" }],
            "service-doc": [{ href: `${SITE_URL}/llms.txt`, type: "text/plain" }],
            "service-meta": [{ href: `${SITE_URL}/pricing.md`, type: "text/markdown" }],
        },
        {
            anchor: `${LEDGER_MCP_ORIGIN}/mcp`,
            "service-doc": [{ href: `${SITE_URL}/auth.md`, type: "text/markdown" }],
            "service-meta": [
                { href: `${LEDGER_MCP_ORIGIN}/.well-known/oauth-protected-resource/mcp`, type: "application/json" },
            ],
        },
    ],
};

export const Route = createFileRoute("/.well-known/api-catalog")({
    server: {
        handlers: {
            GET: () =>
                Response.json(catalog, {
                    headers: {
                        "cache-control": "public, max-age=3600",
                        "content-type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
                        link: `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"`,
                    },
                }),
        },
    },
});

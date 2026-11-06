import { createFileRoute } from "@tanstack/react-router";

import { LEDGER_MCP_ORIGIN } from "@/lib/site";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
    server: {
        handlers: {
            GET: () =>
                new Response(null, {
                    headers: {
                        "access-control-allow-origin": "*",
                        "cache-control": "public, max-age=3600",
                        location: `${LEDGER_MCP_ORIGIN}/.well-known/oauth-authorization-server`,
                    },
                    status: 302,
                }),
        },
    },
});

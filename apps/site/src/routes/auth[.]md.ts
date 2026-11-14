import { createFileRoute } from "@tanstack/react-router";

import { LEDGER_MCP_ORIGIN } from "@/lib/site";

import authMd from "../../content/auth.md?raw";

const body = authMd.replaceAll("{origin}", LEDGER_MCP_ORIGIN);

export const Route = createFileRoute("/auth.md")({
    server: {
        handlers: {
            GET: () =>
                new Response(body, {
                    headers: {
                        "access-control-allow-origin": "*",
                        "cache-control": "public, max-age=3600",
                        "content-type": "text/markdown; charset=utf-8",
                    },
                }),
        },
    },
});

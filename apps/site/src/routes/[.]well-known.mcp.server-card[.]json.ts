import { createFileRoute } from "@tanstack/react-router";

import { SERVER_CARD, SERVER_CARD_TYPE } from "@/lib/mcp";

export const Route = createFileRoute("/.well-known/mcp/server-card.json")({
    server: {
        handlers: {
            GET: ({ request }) =>
                Response.json(SERVER_CARD, {
                    headers: {
                        "access-control-allow-headers": "Content-Type, If-None-Match",
                        "access-control-allow-methods": "GET",
                        "access-control-allow-origin": "*",
                        "cache-control": "public, max-age=3600",
                        "content-type": request.headers.get("accept")?.includes(SERVER_CARD_TYPE)
                            ? SERVER_CARD_TYPE
                            : "application/json",
                    },
                }),
        },
    },
});

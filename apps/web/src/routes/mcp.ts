import { createFileRoute } from "@tanstack/react-router";

import { server } from "@/lib/mcp";

export const Route = createFileRoute("/mcp")({
    server: {
        handlers: {
            DELETE: ({ request }) => server.fetch(request),
            GET: ({ request }) => server.fetch(request),
            POST: ({ request }) => server.fetch(request),
        },
    },
});

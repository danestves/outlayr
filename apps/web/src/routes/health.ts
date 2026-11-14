import { createFileRoute } from "@tanstack/react-router";

const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex" };

const healthy = () => Response.json({ app: "web", status: "ok" }, { headers: HEADERS });

export const Route = createFileRoute("/health")({
    server: {
        handlers: {
            GET: healthy,
            HEAD: () => new Response(null, { headers: HEADERS }),
        },
    },
});

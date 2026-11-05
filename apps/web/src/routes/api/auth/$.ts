import { createFileRoute } from "@tanstack/react-router";

import { withoutOneTimeToken } from "@/lib/account";
import { authServer } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/$")({
    server: {
        handlers: {
            GET: async ({ request }) => withoutOneTimeToken(await authServer().handler(request)),
            POST: async ({ request }) => withoutOneTimeToken(await authServer().handler(request)),
        },
    },
});

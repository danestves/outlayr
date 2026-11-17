import { createFileRoute } from "@tanstack/react-router";

import { asServed, withoutOneTimeToken } from "@/lib/account";
import { authServer } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/$")({
    server: {
        handlers: {
            GET: async ({ request }) => withoutOneTimeToken(await authServer().handler(await asServed(request))),
            POST: async ({ request }) => withoutOneTimeToken(await authServer().handler(await asServed(request))),
        },
    },
});

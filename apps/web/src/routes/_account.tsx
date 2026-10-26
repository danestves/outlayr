import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { authClient } from "@/lib/auth-client";
import { authServer } from "@/lib/auth-server";
import { convexClient } from "@/lib/convex";

const sessionToken = createServerFn({ method: "GET" }).handler(async () => (await authServer().getToken()) ?? null);

export const Route = createFileRoute("/_account")({
    beforeLoad: async () => ({ token: await sessionToken() }),
    component: Account,
    head: () => ({ meta: [{ content: "noindex", name: "robots" }] }),
});

function Account() {
    const { token } = Route.useRouteContext();
    return (
        <ConvexBetterAuthProvider authClient={authClient} client={convexClient()} initialToken={token}>
            <Outlet />
        </ConvexBetterAuthProvider>
    );
}

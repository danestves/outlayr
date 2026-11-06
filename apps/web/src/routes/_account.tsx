import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex";
import { currentToken } from "@/lib/session";

const IN_APP = /^\/app(?:\/|$)/u;

export const Route = createFileRoute("/_account")({
    beforeLoad: async ({ context, location }) => {
        const token = await currentToken(context.session);
        // Here and not on /app, which never runs on the server: a signed-out visitor gets a real redirect.
        if (!token && IN_APP.test(location.pathname)) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
        return { token };
    },
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

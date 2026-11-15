import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex";
import { currentToken, signedOut } from "@/lib/session";

const ACCOUNT_PAGE = /^\/(?:login|connect)(?:\/|$)/u;

export const Route = createFileRoute("/_account")({
    beforeLoad: async ({ context, location }) => {
        const inApp = !ACCOUNT_PAGE.test(location.pathname);
        const token = signedOut() ? null : await currentToken(context.session);
        if (!token && inApp) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
        if (token) {
            context.convexQueryClient?.serverHttpClient?.setAuth(token);
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

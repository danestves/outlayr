import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Outlet, createFileRoute, redirect, useLocation, useMatches } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { authClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex";
import { hasLedgerCopy } from "@/lib/ledger-cache";
import { currentToken, tokenWait } from "@/lib/session";

const IN_APP = /^\/app(?:\/|$)/u;

const HomeFirstVisit = lazy(async () => {
    const pending = await import("@/components/dashboard/home/home-pending");
    return { default: pending.HomeFirstVisit };
});
const AccountsFirstVisit = lazy(async () => {
    const pending = await import("@/components/dashboard/accounts/accounts-pending");
    return { default: pending.AccountsFirstVisit };
});
const SettingsFirstVisit = lazy(async () => {
    const pending = await import("@/components/dashboard/settings/settings-layout");
    return { default: pending.SettingsFirstVisit };
});
const InsightsFirstVisit = lazy(async () => {
    const pending = await import("@/components/dashboard/insights/insights-pending");
    return { default: pending.InsightsFirstVisit };
});
const TransactionsFirstVisit = lazy(async () => {
    const pending = await import("@/components/dashboard/transactions/transactions-pending");
    return { default: pending.TransactionsFirstVisit };
});

export const Route = createFileRoute("/_account")({
    beforeLoad: async ({ context, location }) => {
        const inApp = IN_APP.test(location.pathname);
        const wait = tokenWait();
        if (wait === "round-trip" && inApp) {
            return { token: null };
        }
        const token = wait === "signed-out" ? null : await currentToken(context.session);
        if (!token && inApp) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
        return { token };
    },
    component: Account,
    head: () => ({ meta: [{ content: "noindex", name: "robots" }] }),
});

function firstVisitFor(page: string | undefined) {
    if (page === "insights") {
        return <InsightsFirstVisit />;
    }
    if (page === "accounts") {
        return <AccountsFirstVisit />;
    }
    if (page === "transactions") {
        return <TransactionsFirstVisit />;
    }
    return page === "settings" ? <SettingsFirstVisit /> : <HomeFirstVisit />;
}

function Account() {
    const { token } = Route.useRouteContext();
    const page = useLocation({ select: (location) => location.pathname.split("/")[2] });
    const appStatus = useMatches({
        select: (matches) => matches.find((match) => match.routeId === "/_account/app")?.status,
    });
    return (
        <ConvexBetterAuthProvider authClient={authClient} client={convexClient()} initialToken={token}>
            {appStatus === "pending" && !hasLedgerCopy() ? <Suspense>{firstVisitFor(page)}</Suspense> : null}
            <Outlet />
        </ConvexBetterAuthProvider>
    );
}

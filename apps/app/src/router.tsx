import { ConvexQueryClient } from "@convex-dev/react-query";
import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routerWithDbClient } from "@tanstack/react-router-with-db";
import { ConvexHttpClient } from "convex/browser";

import { convexClient, convexConfigured, serverConvexUrl } from "@/lib/convex";
import { ledgerDependencies, serverDependencies } from "@/lib/db";
import type { Session } from "@/lib/session";

import { routeTree } from "./routeTree.gen";

function queryClients() {
    if (!convexConfigured()) {
        return { convexQueryClient: undefined, queryClient: new QueryClient() };
    }
    const convexQueryClient = new ConvexQueryClient(convexClient());
    if (import.meta.env.SSR) {
        convexQueryClient.serverHttpClient = new ConvexHttpClient(serverConvexUrl());
    }
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { queryFn: convexQueryClient.queryFn(), queryKeyHashFn: convexQueryClient.hashFn() },
        },
    });
    convexQueryClient.connect(queryClient);
    return { convexQueryClient, queryClient };
}

export function getRouter() {
    const { convexQueryClient, queryClient } = queryClients();
    const ledger = convexQueryClient ? ledgerDependencies(convexQueryClient.convexClient) : {};
    const dbClient = new DbClient(import.meta.env.SSR ? serverDependencies() : ledger);
    const session: Session = { token: null };
    const router = createRouter({
        context: { convexQueryClient, dbClient, queryClient, session },
        defaultPreload: "intent",
        routeTree,
        scrollRestoration: true,
        scrollRestorationBehavior: "instant",
        scrollToTopSelectors: ['[data-scroll-restoration-id="dashboard-content"]'],
    });
    setupRouterSsrQueryIntegration({ queryClient, router });
    return routerWithDbClient(router, dbClient);
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}

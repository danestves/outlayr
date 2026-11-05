import { ConvexQueryClient } from "@convex-dev/react-query";
import { DbClient } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routerWithDbClient } from "@tanstack/react-router-with-db";

import { ENV } from "@/env";
import { convexClient } from "@/lib/convex";
import { ledgerDependencies, snapshotClient } from "@/lib/db";

import { routeTree } from "./routeTree.gen";

function queryClients() {
    if (!ENV.VITE_CONVEX_URL) {
        return { convexQueryClient: undefined, queryClient: new QueryClient() };
    }
    const convexQueryClient = new ConvexQueryClient(convexClient());
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
    const http = convexQueryClient?.serverHttpClient;
    const dbClient = new DbClient(
        convexQueryClient ? ledgerDependencies(http ? snapshotClient(http) : convexQueryClient.convexClient) : {}
    );
    const router = createRouter({
        context: { convexQueryClient, dbClient, queryClient },
        defaultPreload: "intent",
        routeTree,
        scrollRestoration: true,
        scrollRestorationBehavior: "instant",
    });
    setupRouterSsrQueryIntegration({ queryClient, router });
    return routerWithDbClient(router, dbClient);
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}

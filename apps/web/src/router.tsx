import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ENV } from "@/env";
import { convexClient } from "@/lib/convex";

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
    const router = createRouter({
        context: { convexQueryClient, queryClient },
        defaultPreload: "intent",
        routeTree,
        scrollRestoration: true,
        scrollRestorationBehavior: "instant",
    });
    setupRouterSsrQueryIntegration({ queryClient, router });
    return router;
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}

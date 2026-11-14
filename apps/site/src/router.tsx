import { createRouter } from "@tanstack/react-router";

import { registerAgentTools } from "@/lib/register-agent-tools";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
    const router = createRouter({
        defaultPreload: "intent",
        routeTree,
        scrollRestoration: true,
        scrollRestorationBehavior: "instant",
    });
    if (typeof document !== "undefined") {
        registerAgentTools(router);
    }
    return router;
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}

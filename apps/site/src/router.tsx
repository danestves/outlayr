import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";

import { registerAgentTools } from "@/lib/register-agent-tools";

import { routeTree } from "./routeTree.gen";

function requestNonce() {
    try {
        return getGlobalStartContext()?.nonce;
    } catch {
        return undefined;
    }
}

export function getRouter() {
    const router = createRouter({
        defaultPreload: "intent",
        routeTree,
        scrollRestoration: true,
        scrollRestorationBehavior: "instant",
        ssr: { nonce: requestNonce() },
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

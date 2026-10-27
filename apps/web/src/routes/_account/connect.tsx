import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ConnectFlow } from "@/components/account/connect-flow";

export const Route = createFileRoute("/_account/connect")({
    beforeLoad: ({ context, location }) => {
        if (!context.token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
    },
    component: Connect,
    head: () => ({ meta: [{ title: "Connect · Outlayr" }] }),
    validateSearch: z.object({ request: z.coerce.string().optional() }),
});

function Connect() {
    return <ConnectFlow requestId={Route.useSearch().request} />;
}

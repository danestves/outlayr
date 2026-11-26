import { createFileRoute, redirect } from "@tanstack/react-router";

import { Webhooks } from "@/components/dashboard/settings/webhooks";
import { webhooksOpen } from "@/lib/webhooks";

export const Route = createFileRoute("/_account/_app/settings/connections_/webhooks")({
    beforeLoad: () => {
        if (!webhooksOpen(Date.now())) {
            throw redirect({ to: "/settings/connections" });
        }
    },
    component: Webhooks,
});

import { createFileRoute } from "@tanstack/react-router";

import { Connections } from "@/components/dashboard/settings/connections";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/connections")({
    head: pageHead("settingsConnections"),
    component: Connections,
});

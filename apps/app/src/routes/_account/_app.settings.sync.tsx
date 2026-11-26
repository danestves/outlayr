import { createFileRoute } from "@tanstack/react-router";

import { Sync } from "@/components/dashboard/settings/sync";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/sync")({
    head: pageHead("settingsSync"),
    component: Sync,
});

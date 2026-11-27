import { createFileRoute } from "@tanstack/react-router";

import { Usage } from "@/components/dashboard/settings/usage";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/usage")({
    head: pageHead("settingsUsage"),
    component: Usage,
});

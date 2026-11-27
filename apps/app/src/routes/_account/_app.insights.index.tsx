import { createFileRoute } from "@tanstack/react-router";

import { OverviewScreen } from "@/components/dashboard/insights/overview/screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/")({
    head: pageHead("insights"),
    component: OverviewScreen,
});

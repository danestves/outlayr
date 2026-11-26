import { createFileRoute } from "@tanstack/react-router";

import { RecapScreen } from "@/components/dashboard/insights/recap/screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/recap")({
    head: pageHead("recap"),
    component: RecapScreen,
});

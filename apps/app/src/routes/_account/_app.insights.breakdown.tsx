import { createFileRoute } from "@tanstack/react-router";

import { BreakdownScreen } from "@/components/dashboard/insights/breakdown/screen";
import { breakdownSearch } from "@/components/dashboard/insights/breakdown/search";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/breakdown")({
    head: pageHead("breakdown"),
    component: BreakdownScreen,
    validateSearch: breakdownSearch,
});

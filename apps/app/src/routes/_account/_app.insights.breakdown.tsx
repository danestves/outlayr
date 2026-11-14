import { createFileRoute } from "@tanstack/react-router";

import { BreakdownScreen } from "@/components/dashboard/insights/breakdown/screen";
import { breakdownSearch } from "@/components/dashboard/insights/breakdown/search";

export const Route = createFileRoute("/_account/_app/insights/breakdown")({
    component: BreakdownScreen,
    validateSearch: breakdownSearch,
});

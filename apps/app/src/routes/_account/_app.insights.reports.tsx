import { createFileRoute } from "@tanstack/react-router";

import { ReportsScreen } from "@/components/dashboard/insights/reports/screen";
import { reportsSearch } from "@/components/dashboard/insights/reports/search";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/reports")({
    head: pageHead("reports"),
    component: ReportsScreen,
    validateSearch: reportsSearch,
});

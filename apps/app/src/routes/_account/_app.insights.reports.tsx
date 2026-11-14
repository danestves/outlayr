import { createFileRoute } from "@tanstack/react-router";

import { ReportsScreen } from "@/components/dashboard/insights/reports/screen";
import { reportsSearch } from "@/components/dashboard/insights/reports/search";

export const Route = createFileRoute("/_account/_app/insights/reports")({
    component: ReportsScreen,
    validateSearch: reportsSearch,
});

import { createFileRoute } from "@tanstack/react-router";

import { YearScreen } from "@/components/dashboard/insights/year/screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/year")({
    head: pageHead("year"),
    component: YearScreen,
});

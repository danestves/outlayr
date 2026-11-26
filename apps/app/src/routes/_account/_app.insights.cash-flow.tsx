import { createFileRoute } from "@tanstack/react-router";

import { CashFlowScreen } from "@/components/dashboard/insights/flow/screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/cash-flow")({
    head: pageHead("cashFlow"),
    component: CashFlowScreen,
});

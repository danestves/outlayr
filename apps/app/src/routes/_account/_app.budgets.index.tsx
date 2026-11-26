import { createFileRoute } from "@tanstack/react-router";

import { BudgetsScreen } from "@/components/dashboard/budgets/budgets-screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/budgets/")({
    head: pageHead("budgets"),
    component: BudgetsScreen,
});

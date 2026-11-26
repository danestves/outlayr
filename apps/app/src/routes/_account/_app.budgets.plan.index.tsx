import { createFileRoute } from "@tanstack/react-router";

import { PlanYearScreen } from "@/components/dashboard/budgets/plan-year";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/budgets/plan/")({
    head: pageHead("budgetPlan"),
    component: PlanYearScreen,
});

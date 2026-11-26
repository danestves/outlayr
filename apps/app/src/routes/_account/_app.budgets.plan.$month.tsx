import { createFileRoute } from "@tanstack/react-router";

import { PlanMonthScreen } from "@/components/dashboard/budgets/plan-month";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/budgets/plan/$month")({
    head: pageHead("budgetPlan"),
    component: Month,
});

function Month() {
    const { month } = Route.useParams();
    return <PlanMonthScreen month={month} />;
}

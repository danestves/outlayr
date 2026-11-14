import { createFileRoute } from "@tanstack/react-router";

import { PlanMonthScreen } from "@/components/dashboard/budgets/plan-month";

export const Route = createFileRoute("/_account/app/budgets/plan/$month")({ component: Month });

function Month() {
    const { month } = Route.useParams();
    return <PlanMonthScreen month={month} />;
}

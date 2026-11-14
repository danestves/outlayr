import { createFileRoute } from "@tanstack/react-router";

import { PlanYearScreen } from "@/components/dashboard/budgets/plan-year";

export const Route = createFileRoute("/_account/app/budgets/plan/")({ component: PlanYearScreen });

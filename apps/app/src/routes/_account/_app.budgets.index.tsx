import { createFileRoute } from "@tanstack/react-router";

import { BudgetsScreen } from "@/components/dashboard/budgets/budgets-screen";

export const Route = createFileRoute("/_account/_app/budgets/")({ component: BudgetsScreen });

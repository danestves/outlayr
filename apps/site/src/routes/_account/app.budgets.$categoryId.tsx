import { createFileRoute } from "@tanstack/react-router";

import { BudgetDetailScreen } from "@/components/dashboard/budgets/budget-detail";

export const Route = createFileRoute("/_account/app/budgets/$categoryId")({ component: Detail });

function Detail() {
    const { categoryId } = Route.useParams();
    return <BudgetDetailScreen categoryId={categoryId} />;
}

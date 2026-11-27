import { createFileRoute } from "@tanstack/react-router";

import { BudgetDetailScreen } from "@/components/dashboard/budgets/budget-detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/budgets/$categoryId")({
    head: pageHead("budget"),
    component: Detail,
});

function Detail() {
    const { categoryId } = Route.useParams();
    return <BudgetDetailScreen categoryId={categoryId} />;
}

import { createFileRoute } from "@tanstack/react-router";

import { GoalDetail } from "@/components/dashboard/goals/goal-detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/goals/$goalId")({
    head: pageHead("goal"),
    component: Detail,
});

function Detail() {
    const { goalId } = Route.useParams();
    return <GoalDetail goalId={goalId} />;
}

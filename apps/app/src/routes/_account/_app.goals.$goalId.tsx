import { createFileRoute } from "@tanstack/react-router";

import { GoalDetail } from "@/components/dashboard/goals/goal-detail";

export const Route = createFileRoute("/_account/_app/goals/$goalId")({ component: Detail });

function Detail() {
    const { goalId } = Route.useParams();
    return <GoalDetail goalId={goalId} />;
}

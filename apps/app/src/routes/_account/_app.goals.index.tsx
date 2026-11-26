import { createFileRoute } from "@tanstack/react-router";

import { GoalsScreen } from "@/components/dashboard/goals/goals-screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/goals/")({
    head: pageHead("goals"),
    component: GoalsScreen,
});

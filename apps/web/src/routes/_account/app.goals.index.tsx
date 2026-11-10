import { createFileRoute } from "@tanstack/react-router";

import { GoalsScreen } from "@/components/dashboard/goals/goals-screen";

export const Route = createFileRoute("/_account/app/goals/")({ component: GoalsScreen });

import { createFileRoute } from "@tanstack/react-router";

import { GoalsScreen } from "@/components/dashboard/goals/goals-screen";

export const Route = createFileRoute("/_account/_app/goals/")({ component: GoalsScreen });

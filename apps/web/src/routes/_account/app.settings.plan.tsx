import { createFileRoute } from "@tanstack/react-router";

import { Plan } from "@/components/dashboard/settings/plan";

export const Route = createFileRoute("/_account/app/settings/plan")({ component: Plan });

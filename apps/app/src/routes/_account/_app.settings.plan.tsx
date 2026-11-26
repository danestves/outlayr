import { createFileRoute } from "@tanstack/react-router";

import { Plan } from "@/components/dashboard/settings/plan";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/plan")({
    head: pageHead("settingsPlan"),
    component: Plan,
});

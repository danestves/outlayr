import { createFileRoute } from "@tanstack/react-router";

import { Time } from "@/components/dashboard/settings/time";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/time")({
    head: pageHead("settingsTime"),
    component: Time,
});

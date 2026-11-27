import { createFileRoute } from "@tanstack/react-router";

import { Invite } from "@/components/dashboard/settings/invite";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/invite")({
    head: pageHead("settingsInvite"),
    component: Invite,
});

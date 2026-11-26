import { createFileRoute } from "@tanstack/react-router";

import { Notifications } from "@/components/dashboard/settings/notifications";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/notifications")({
    head: pageHead("settingsNotifications"),
    component: Notifications,
});

import { createFileRoute } from "@tanstack/react-router";

import { Notifications } from "@/components/dashboard/settings/notifications";

export const Route = createFileRoute("/_account/_app/settings/notifications")({ component: Notifications });

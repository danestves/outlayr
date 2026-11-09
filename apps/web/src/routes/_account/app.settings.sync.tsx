import { createFileRoute } from "@tanstack/react-router";

import { Sync } from "@/components/dashboard/settings/sync";

export const Route = createFileRoute("/_account/app/settings/sync")({ component: Sync });

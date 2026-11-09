import { createFileRoute } from "@tanstack/react-router";

import { Connections } from "@/components/dashboard/settings/connections";

export const Route = createFileRoute("/_account/app/settings/connections")({ component: Connections });

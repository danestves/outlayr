import { createFileRoute } from "@tanstack/react-router";

import { Connections } from "@/components/dashboard/settings/connections";

export const Route = createFileRoute("/_account/_app/settings/connections")({ component: Connections });

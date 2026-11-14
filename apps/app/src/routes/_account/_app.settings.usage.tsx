import { createFileRoute } from "@tanstack/react-router";

import { Usage } from "@/components/dashboard/settings/usage";

export const Route = createFileRoute("/_account/_app/settings/usage")({ component: Usage });

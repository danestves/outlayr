import { createFileRoute } from "@tanstack/react-router";

import { Invite } from "@/components/dashboard/settings/invite";

export const Route = createFileRoute("/_account/_app/settings/invite")({ component: Invite });

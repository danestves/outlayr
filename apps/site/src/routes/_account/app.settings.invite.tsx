import { createFileRoute } from "@tanstack/react-router";

import { Invite } from "@/components/dashboard/settings/invite";

export const Route = createFileRoute("/_account/app/settings/invite")({ component: Invite });

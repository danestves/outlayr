import { createFileRoute } from "@tanstack/react-router";

import { Preferences } from "@/components/dashboard/settings/preferences";

export const Route = createFileRoute("/_account/app/settings/preferences")({ component: Preferences });

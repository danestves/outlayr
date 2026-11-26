import { createFileRoute } from "@tanstack/react-router";

import { ProfileSettings } from "@/components/dashboard/settings/profile";

export const Route = createFileRoute("/_account/_app/settings/profile")({ component: ProfileSettings });

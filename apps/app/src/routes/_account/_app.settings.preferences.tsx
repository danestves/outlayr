import { createFileRoute } from "@tanstack/react-router";

import { Preferences } from "@/components/dashboard/settings/preferences";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/preferences")({
    head: pageHead("settingsPreferences"),
    component: Preferences,
});

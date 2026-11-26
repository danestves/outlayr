import { createFileRoute } from "@tanstack/react-router";

import { Email } from "@/components/dashboard/settings/email";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/email")({
    head: pageHead("settingsEmail"),
    component: Email,
});

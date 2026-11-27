import { createFileRoute } from "@tanstack/react-router";

import { Account } from "@/components/dashboard/settings/account";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/account")({
    head: pageHead("settingsAccount"),
    component: Account,
});

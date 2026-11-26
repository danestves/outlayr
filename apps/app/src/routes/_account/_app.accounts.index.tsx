import { createFileRoute } from "@tanstack/react-router";

import { AccountsScreen } from "@/components/dashboard/accounts/accounts-screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/accounts/")({
    head: pageHead("accounts"),
    component: AccountsScreen,
});

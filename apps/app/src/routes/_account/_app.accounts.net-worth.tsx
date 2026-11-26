import { createFileRoute } from "@tanstack/react-router";

import { NetWorthScreen } from "@/components/dashboard/accounts/net-worth";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/accounts/net-worth")({
    head: pageHead("netWorth"),
    component: NetWorthScreen,
});

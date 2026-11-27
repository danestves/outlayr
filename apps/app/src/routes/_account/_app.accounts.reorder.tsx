import { createFileRoute } from "@tanstack/react-router";

import { ReorderAccounts } from "@/components/dashboard/accounts/reorder";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/accounts/reorder")({
    head: pageHead("reorderAccounts"),
    component: ReorderAccounts,
});

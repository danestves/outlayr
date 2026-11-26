import { createFileRoute } from "@tanstack/react-router";

import { DebtsScreen } from "@/components/dashboard/debts/debts-screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/debts/")({
    head: pageHead("debts"),
    component: DebtsScreen,
});

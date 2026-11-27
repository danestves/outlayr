import { createFileRoute } from "@tanstack/react-router";

import { InstallmentsScreen } from "@/components/dashboard/installments/installments-screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/installments/")({
    head: pageHead("installments"),
    component: InstallmentsScreen,
});

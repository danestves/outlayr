import { createFileRoute } from "@tanstack/react-router";

import { DashboardHome } from "@/components/dashboard/home/dashboard-home";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/")({
    head: pageHead("home"),
    component: DashboardHome,
});

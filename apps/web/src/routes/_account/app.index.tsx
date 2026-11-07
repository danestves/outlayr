import { createFileRoute } from "@tanstack/react-router";

import { DashboardHome } from "@/components/dashboard/home/dashboard-home";

export const Route = createFileRoute("/_account/app/")({ component: DashboardHome });

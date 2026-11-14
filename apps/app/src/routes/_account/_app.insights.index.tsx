import { createFileRoute } from "@tanstack/react-router";

import { OverviewScreen } from "@/components/dashboard/insights/overview/screen";

export const Route = createFileRoute("/_account/_app/insights/")({ component: OverviewScreen });

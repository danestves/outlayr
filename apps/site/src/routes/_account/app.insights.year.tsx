import { createFileRoute } from "@tanstack/react-router";

import { YearScreen } from "@/components/dashboard/insights/year/screen";

export const Route = createFileRoute("/_account/app/insights/year")({ component: YearScreen });

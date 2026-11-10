import { createFileRoute } from "@tanstack/react-router";

import { RecapScreen } from "@/components/dashboard/insights/recap/screen";

export const Route = createFileRoute("/_account/app/insights/recap")({ component: RecapScreen });

import { createFileRoute } from "@tanstack/react-router";

import { RecapScreen } from "@/components/dashboard/insights/recap/screen";

export const Route = createFileRoute("/_account/_app/insights/recap")({ component: RecapScreen });

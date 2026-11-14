import { createFileRoute } from "@tanstack/react-router";

import { CashFlowScreen } from "@/components/dashboard/insights/flow/screen";

export const Route = createFileRoute("/_account/_app/insights/cash-flow")({ component: CashFlowScreen });

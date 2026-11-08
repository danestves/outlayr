import { createFileRoute } from "@tanstack/react-router";

import { InsightsScreen } from "@/components/dashboard/insights/insights-screen";
import { useInsightsModel } from "@/components/dashboard/insights/model";
import { useDashboard } from "@/components/dashboard/shell/dashboard";

export const Route = createFileRoute("/_account/app/insights")({ component: Insights });

function Insights() {
    const model = useInsightsModel(useDashboard());
    return <InsightsScreen model={model} />;
}

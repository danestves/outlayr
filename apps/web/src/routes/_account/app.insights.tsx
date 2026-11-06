import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { InsightsMain } from "@/components/dashboard/insights/insights-screen";
import { useInsightsModel } from "@/components/dashboard/insights/model";
import { InsightsPanel } from "@/components/dashboard/insights/panel";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Workspace } from "@/components/dashboard/shell/workspace";

export const Route = createFileRoute("/_account/app/insights")({ component: Insights });

function Insights() {
    const { nav } = useIntlayer("dashboard");
    const dashboard = useDashboard();
    const model = useInsightsModel(dashboard);
    return (
        <Workspace main={<InsightsMain model={model} />} panel={<InsightsPanel model={model} />} title={nav.insights} />
    );
}

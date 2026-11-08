import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { InsightsScreen } from "./insights-screen";
import { useInsightsModel } from "./model";

export function InsightsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const model = useInsightsModel(sample);
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <InsightsScreen model={model} />
        </Sampled>
    );
}

export function InsightsFirstVisit() {
    return (
        <DashboardShell>
            <InsightsPending />
        </DashboardShell>
    );
}

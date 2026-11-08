import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import { Workspace } from "@/components/dashboard/shell/workspace";

import { InsightsMain } from "./insights-screen";
import { useInsightsModel } from "./model";
import { InsightsPanel } from "./panel";

export function InsightsPending() {
    const { loadingLabel, nav } = useIntlayer("dashboard");
    const sample = useSample();
    const model = useInsightsModel(sample);
    return (
        <Workspace
            main={
                <Sampled label={loadingLabel.value} sample={sample}>
                    <InsightsMain model={model} />
                </Sampled>
            }
            panel={
                <Sampled sample={sample}>
                    <InsightsPanel model={model} />
                </Sampled>
            }
            title={nav.insights}
        />
    );
}

export function InsightsFirstVisit() {
    return (
        <DashboardShell>
            <InsightsPending />
        </DashboardShell>
    );
}

import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { DashboardHome } from "./dashboard-home";

export function HomePending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <DashboardHome />
        </Sampled>
    );
}

export function HomeFirstVisit() {
    return (
        <DashboardShell>
            <HomePending />
        </DashboardShell>
    );
}

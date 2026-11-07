import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";

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

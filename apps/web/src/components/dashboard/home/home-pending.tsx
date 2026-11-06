import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { Workspace } from "@/components/dashboard/shell/workspace";

import { HomeMain, HomePanel } from "./dashboard-home";

export function HomePending() {
    const { loadingLabel, nav } = useIntlayer("dashboard");
    const sample = useSample();
    return (
        <Workspace
            main={
                <Sampled label={loadingLabel.value} sample={sample}>
                    <HomeMain />
                </Sampled>
            }
            panel={
                <Sampled sample={sample}>
                    <HomePanel />
                </Sampled>
            }
            title={nav.dashboard}
        />
    );
}

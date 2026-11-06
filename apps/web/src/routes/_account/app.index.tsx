import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { OverviewMain, OverviewPanel } from "@/components/dashboard/shell/overview-screen";
import { Workspace } from "@/components/dashboard/shell/workspace";

export const Route = createFileRoute("/_account/app/")({ component: Dashboard });

function Dashboard() {
    const { nav } = useIntlayer("dashboard");
    const { overview, photos } = useDashboard();
    return (
        <Workspace
            main={<OverviewMain overview={overview} photos={photos} />}
            panel={<OverviewPanel overview={overview} photos={photos} />}
            title={nav.dashboard}
        />
    );
}

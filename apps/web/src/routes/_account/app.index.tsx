import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { HomeMain, HomePanel } from "@/components/dashboard/home/dashboard-home";
import { Workspace } from "@/components/dashboard/shell/workspace";

export const Route = createFileRoute("/_account/app/")({ component: Dashboard });

function Dashboard() {
    const { nav } = useIntlayer("dashboard");
    return <Workspace main={<HomeMain />} panel={<HomePanel />} title={nav.dashboard} />;
}

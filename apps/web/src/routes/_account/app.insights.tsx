import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Workspace } from "@/components/dashboard/shell/workspace";

export const Route = createFileRoute("/_account/app/insights")({ component: Insights });

function Insights() {
    const { nav } = useIntlayer("dashboard");
    return <Workspace main={null} title={nav.insights} />;
}

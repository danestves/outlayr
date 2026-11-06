import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { DashboardShell } from "./shell/shell";

const HomePending = lazy(async () => {
    const pending = await import("./home/home-pending");
    return { default: pending.HomePending };
});
const InsightsPending = lazy(async () => {
    const pending = await import("./insights/insights-pending");
    return { default: pending.InsightsPending };
});

export function FirstVisitPending() {
    const onInsights = useLocation({ select: (location) => location.pathname.endsWith("/insights") });
    return (
        <DashboardShell>
            <Suspense>{onInsights ? <InsightsPending /> : <HomePending />}</Suspense>
        </DashboardShell>
    );
}

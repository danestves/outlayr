import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Workspace } from "./shell/workspace";

const SKELETON_HOLD_MS = 150;

const HomePending = lazy(async () => {
    const pending = await import("./home/home-pending");
    return { default: pending.HomePending };
});
const InsightsPending = lazy(async () => {
    const pending = await import("./insights/insights-pending");
    return { default: pending.InsightsPending };
});

// A restored ledger lands inside the hold, so a reload never loads, renders or measures the skeleton.
function useHeld() {
    const [held, setHeld] = useState(true);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the clock is an external system.
    useEffect(() => {
        const timer = setTimeout(() => setHeld(false), SKELETON_HOLD_MS);
        return () => clearTimeout(timer);
    }, []);
    return held;
}

export function DashboardPending() {
    const { nav } = useIntlayer("dashboard");
    const onInsights = useLocation({ select: (location) => location.pathname.endsWith("/insights") });
    const held = useHeld();
    const blank = <Workspace main={null} panel={null} title={onInsights ? nav.insights : nav.dashboard} />;
    if (held) {
        return blank;
    }
    return <Suspense fallback={blank}>{onInsights ? <InsightsPending /> : <HomePending />}</Suspense>;
}

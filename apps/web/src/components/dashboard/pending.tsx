import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useTimeout } from "@/lib/timeout";

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
    useTimeout(() => setHeld(false), SKELETON_HOLD_MS, undefined);
    return held;
}

export function DashboardPending() {
    const { nav } = useIntlayer("dashboard");
    const onInsights = useLocation({ select: (location) => location.pathname.endsWith("/insights") });
    const held = useHeld();
    const blank = onInsights ? <Workspace main={null} panel={null} title={nav.insights} /> : null;
    if (held) {
        return blank;
    }
    return <Suspense fallback={blank}>{onInsights ? <InsightsPending /> : <HomePending />}</Suspense>;
}

import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";

import { useTimeout } from "@/lib/timeout";

const SKELETON_HOLD_MS = 150;

const HomePending = lazy(async () => {
    const pending = await import("./home/home-pending");
    return { default: pending.HomePending };
});
const AccountsPending = lazy(async () => {
    const pending = await import("./accounts/accounts-pending");
    return { default: pending.AccountsPending };
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
    const onInsights = useLocation({ select: (location) => location.pathname.endsWith("/insights") });
    const onAccounts = useLocation({ select: (location) => location.pathname.startsWith("/app/accounts") });
    const held = useHeld();
    if (held) {
        return null;
    }
    const screen = onAccounts ? <AccountsPending /> : <HomePending />;
    return <Suspense fallback={null}>{onInsights ? <InsightsPending /> : screen}</Suspense>;
}

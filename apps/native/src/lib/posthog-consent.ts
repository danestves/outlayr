import { useEffect } from "react";

import { useLocalData } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import { posthog } from "@/lib/posthog";

export function useAnalyticsConsent() {
    const { db } = useLocalData();
    const share = useMeta(db, "shareAnalytics");
    // oxlint-disable-next-line outlayr/react-effect-budget -- keeps the PostHog client's opt-in state equal to the analytics setting
    useEffect(() => {
        if (posthog === null || db === null) {
            return;
        }
        void (share ? posthog.optIn() : posthog.optOut());
    }, [db, share]);
}

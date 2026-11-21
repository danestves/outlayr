import { useLocalData } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import { useMirror } from "@/lib/lifecycle";
import { posthog } from "@/lib/posthog";

export function useAnalyticsConsent() {
    const { db } = useLocalData();
    const share = useMeta(db, "shareAnalytics");
    useMirror([db, share], () => {
        if (posthog === null || db === null) {
            return;
        }
        void (share ? posthog.optIn() : posthog.optOut());
    });
}

import { useAtomValue } from "@effect/atom-react/Hooks";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { useUpdateWaiting } from "@/components/update-sheet";
import { useDatabase } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import { useAiConsent } from "@/data/settings";
import { pendingNotices } from "@/domain/policy-notice";
import { useAuthSession } from "@/lib/auth-session";
import { policyNoticesAtom } from "@/lib/policy-notices";

// The lock shield and the launch sheets leave the tab focused underneath, and a Modal over them would take their taps.
export function useTourBlocked(): boolean {
    const db = useDatabase();
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const { gate } = useAuthSession();
    const consent = useAiConsent(db);
    const updateDue = useUpdateWaiting();
    const notices = useAtomValue(policyNoticesAtom);
    const privacySeen = useMeta(db, "privacyNoticeSeen");
    const termsSeen = useMeta(db, "termsNoticeSeen");
    const consentDue = gate === "signed-in" && consent === "unanswered";
    const noticeDue = pendingNotices(notices, { privacy: privacySeen, terms: termsSeen }).length > 0;
    return !lockOpen || covered || consentDue || updateDue || noticeDue;
}

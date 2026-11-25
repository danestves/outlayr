import { useRouter, useSegments } from "expo-router";

import { useWhen } from "@/lib/lifecycle";
import { takeInviteLink, usePendingInviteLink } from "@/lib/pending-invite-link";
import { useTourBlocked } from "@/tour/use-tour-blocked";

/** Opens an invite link once the ledger is up, including one tapped during onboarding or while signed out. */
export function PendingInviteLink({ ready }: { ready: boolean }) {
    const router = useRouter();
    const pending = usePendingInviteLink();
    const [section] = useSegments();
    // The guard moves the stack off onboarding and sign-in after the group flips; the push has to land after that.
    const settled = section !== "onboarding" && section !== "auth";
    // UIKit drops a sheet presented over another, so the invite waits out the launch sheets.
    const blocked = useTourBlocked();

    useWhen(ready && settled && !blocked && pending !== null, () => {
        const invite = takeInviteLink();
        if (invite === null) {
            return;
        }
        router.push(invite.kind === "join" ? `/join/${invite.code}` : `/i/${invite.code}`);
    });

    return null;
}

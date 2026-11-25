import { clearInitialURL } from "expo-linking";

import { IMPORT_PATHS } from "@/domain/import-paths";
import { backupHandover } from "@/lib/backup-handover";
import { deepLinkTarget, inviteLink, redirectLaunchPath } from "@/lib/deep-links";
import { moneyManagerSession } from "@/lib/money-manager-session";
import { holdInviteLink } from "@/lib/pending-invite-link";
import { posthog } from "@/lib/posthog";
import { prefetchProfileInvite } from "@/lib/profile-sharing";

// Every link from outside the bundle (widgets, App Intents, Siri, quick actions, opened files) passes through here.
export function redirectSystemPath(event: { path: string | null; initial: boolean }) {
    const handover = event.path === null ? null : backupHandover(event.path);
    if (handover !== null) {
        posthog?.capture("app_link_opened", { cold_start: event.initial, target: "backup_file" });
        if (event.initial) {
            drainLaunchURL();
        }
        // During the first run the guard sends this to the cover, which picks the backup up from the session.
        moneyManagerSession.handOver(handover);
        return IMPORT_PATHS.ledger.open;
    }
    const target = event.path === null ? null : deepLinkTarget(event.path);
    if (target !== null) {
        posthog?.capture("app_link_opened", { cold_start: event.initial, target });
    }
    const path = redirectLaunchPath(event, drainLaunchURL);
    const invite = path === null ? null : inviteLink(path);
    if (invite !== null) {
        // Onboarding and sign-in guard the invite routes away, so the link waits until the ledger can open it.
        holdInviteLink(invite);
        if (invite.kind === "join") {
            prefetchProfileInvite(invite.code);
        }
        return null;
    }
    return path;
}

// Dev only: the replay it prevents needs a dev reload to re-mount `ExpoRoot`, and a drained registry cannot be
// recovered if expo-router ever reads the launch URL later than it does today.
function drainLaunchURL() {
    if (__DEV__) {
        clearInitialURL();
    }
}

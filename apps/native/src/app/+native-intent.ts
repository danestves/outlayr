import { clearInitialURL } from "expo-linking";

import { IMPORT_PATHS } from "@/domain/import-paths";
import { backupHandover } from "@/lib/backup-handover";
import { redirectLaunchPath } from "@/lib/deep-links";
import { moneyManagerSession } from "@/lib/money-manager-session";

// Every link from outside the bundle (widgets, App Intents, Siri, quick actions, opened files) passes through here.
export function redirectSystemPath(event: { path: string | null; initial: boolean }) {
    const handover = event.path === null ? null : backupHandover(event.path);
    if (handover !== null) {
        if (event.initial) {
            drainLaunchURL();
        }
        // During the first run the guard sends this to the cover, which picks the backup up from the session.
        moneyManagerSession.handOver(handover);
        return IMPORT_PATHS.ledger.open;
    }
    return redirectLaunchPath(event, drainLaunchURL);
}

// Dev only: the replay it prevents needs a dev reload to re-mount `ExpoRoot`, and a drained registry cannot be
// recovered if expo-router ever reads the launch URL later than it does today.
function drainLaunchURL() {
    if (__DEV__) {
        clearInitialURL();
    }
}

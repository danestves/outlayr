import { clearInitialURL } from "expo-linking";

import { redirectLaunchPath } from "@/lib/deep-links";

// Every link from outside the bundle (widgets, App Intents, Siri, quick actions) passes through here.
export function redirectSystemPath(event: { path: string | null; initial: boolean }) {
    return redirectLaunchPath(event, drainLaunchURL);
}

// Dev only: the replay it prevents needs a dev reload to re-mount `ExpoRoot`, and a drained registry cannot be
// recovered if expo-router ever reads the launch URL later than it does today.
function drainLaunchURL() {
    if (__DEV__) {
        clearInitialURL();
    }
}

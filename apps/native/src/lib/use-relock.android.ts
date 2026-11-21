import type { AppStateStatus } from "react-native";

import { handoffOverran, takeHandoff } from "@/lib/app-handoff";
import { subscribeAppState } from "@/lib/app-state";
import { useEventListener } from "@/lib/lifecycle";
import type { useRelock as iosUseRelock } from "@/lib/use-relock";

/**
 * Android has no `inactive`, and `background` looks the same for Home and for Outlayr's own camera, picker, share
 * sheet or Custom Tab. So leaving relocks unless Outlayr announced the trip, and a trip past `HANDOFF_TRIP_CAP_MS`
 * relocks on return, since a detour from it to Home is invisible from here.
 */
export const useRelock: typeof iosUseRelock = (relock) => {
    useEventListener(
        (listener: (status: AppStateStatus) => void) => subscribeAppState(listener),
        (phase) => {
            if (phase === "background" && !takeHandoff()) {
                relock();
            }
            if (phase === "active" && handoffOverran()) {
                relock();
            }
        }
    );
};

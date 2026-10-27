import { useEffect } from "react";

import { handoffOverran, takeHandoff } from "@/lib/app-handoff";
import { subscribeAppState } from "@/lib/app-state";
import type { useRelock as iosUseRelock } from "@/lib/use-relock";

/**
 * Android has no `inactive`, and `background` looks the same for Home and for Outlayr's own camera, picker, share
 * sheet or Custom Tab. So leaving relocks unless Outlayr announced the trip, and a trip past `HANDOFF_TRIP_CAP_MS`
 * relocks on return, since a detour from it to Home is invisible from here.
 */
export const useRelock: typeof iosUseRelock = (relock) => {
    // oxlint-disable-next-line outlayr/react-effect-budget -- subscribes to AppState phase changes for the gate's lifetime
    useEffect(
        () =>
            subscribeAppState((phase) => {
                if (phase === "background" && !takeHandoff()) {
                    relock();
                }
                if (phase === "active" && handoffOverran()) {
                    relock();
                }
            }),
        [relock]
    );
};

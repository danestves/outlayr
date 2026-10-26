import { useEffect } from "react";

import { relocksOnPhase } from "@/domain/app-lock";
import { subscribeAppState } from "@/lib/app-state";

export function useRelock(relock: () => void): void {
    // oxlint-disable-next-line outlayr/react-effect-budget -- subscribes to AppState phase changes for the gate's lifetime
    useEffect(
        () =>
            subscribeAppState((phase) => {
                if (relocksOnPhase(phase)) {
                    relock();
                }
            }),
        [relock]
    );
}

import type { AppStateStatus } from "react-native";

import { relocksOnPhase } from "@/domain/app-lock";
import { subscribeAppState } from "@/lib/app-state";
import { useEventListener } from "@/lib/lifecycle";

export function useRelock(relock: () => void): void {
    useEventListener(
        (listener: (status: AppStateStatus) => void) => subscribeAppState(listener),
        (phase) => {
            if (relocksOnPhase(phase)) {
                relock();
            }
        }
    );
}

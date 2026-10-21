import { useEffect } from "react";
import { AppState } from "react-native";

import { relocksOnPhase } from "@/domain/app-lock";

export function useRelock(relock: () => void): void {
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (phase) => {
            if (relocksOnPhase(phase)) {
                relock();
            }
        });
        return () => {
            subscription.remove();
        };
    }, [relock]);
}

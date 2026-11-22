import { useIsFocused } from "expo-router";
import { BackHandler } from "react-native";

import { useEventListener } from "@/lib/lifecycle";

// Registered after the navigator's handler so it runs first; an open sheet or dialog still takes the press first.
// Only while focused: a screen pushed over the form keeps it mounted, and its back is its own.
export function useStageBack(onBack: (() => void) | undefined) {
    const focused = useIsFocused();
    const enabled = onBack !== undefined && focused;
    useEventListener(
        (listener) => {
            if (!enabled) {
                return () => undefined;
            }
            const subscription = BackHandler.addEventListener("hardwareBackPress", listener);
            return () => subscription.remove();
        },
        () => {
            onBack?.();
            return true;
        },
        [enabled]
    );
}

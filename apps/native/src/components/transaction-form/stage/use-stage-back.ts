import { useIsFocused } from "expo-router";
import { useEffect, useEffectEvent } from "react";
import { BackHandler } from "react-native";

// Registered after the navigator's handler so it runs first; an open sheet or dialog still takes the press first.
// Only while focused: a screen pushed over the form keeps it mounted, and its back is its own.
export function useStageBack(onBack: (() => void) | undefined) {
    const stepBack = useEffectEvent(() => onBack?.());
    const focused = useIsFocused();
    const enabled = onBack !== undefined && focused;
    // oxlint-disable-next-line outlayr/react-effect-budget -- registers the Android hardware back handler while the stage is focused
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            stepBack();
            return true;
        });
        return () => subscription.remove();
    }, [enabled]);
}

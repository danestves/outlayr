import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

export const subscribeAppState = (listener: (status: AppStateStatus) => void): (() => void) => {
    const subscription = AppState.addEventListener("change", listener);
    return () => {
        subscription.remove();
    };
};

const isAppActive = () => AppState.currentState === "active";

const isAppForeground = () => AppState.currentState !== "background";

export function useAppActive(): boolean {
    return useSyncExternalStore(subscribeAppState, isAppActive);
}

export function useAppForeground(): boolean {
    return useSyncExternalStore(subscribeAppState, isAppForeground);
}

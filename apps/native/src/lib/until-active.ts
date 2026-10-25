import { AppState } from "react-native";

export function untilActive(): Promise<void> {
    if (AppState.currentState === "active") {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const subscription = AppState.addEventListener("change", (phase) => {
            if (phase === "active") {
                subscription.remove();
                resolve();
            }
        });
    });
}

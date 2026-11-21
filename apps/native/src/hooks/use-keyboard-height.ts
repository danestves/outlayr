import { useSyncExternalStore } from "react";
import { Keyboard } from "react-native";
import type { EmitterSubscription, KeyboardEvent, KeyboardEventName } from "react-native";

import { useEventListener } from "@/lib/lifecycle";

interface KeyboardHeightStore {
    getSnapshot: () => number;
    subscribe: (listener: () => void) => () => void;
}

function createKeyboardHeightStore(
    show: KeyboardEventName,
    hide: KeyboardEventName,
    read: () => number
): KeyboardHeightStore {
    const listeners = new Set<() => void>();
    let subscriptions: EmitterSubscription[] = [];
    let height = read();

    const set = (next: number) => {
        if (next === height) {
            return;
        }
        height = next;
        for (const listener of listeners) {
            listener();
        }
    };

    return {
        getSnapshot: () => (listeners.size === 0 ? read() : height),
        subscribe: (listener) => {
            if (listeners.size === 0) {
                height = read();
                subscriptions = [
                    Keyboard.addListener(show, (event) => set(event.endCoordinates.height)),
                    Keyboard.addListener(hide, () => set(0)),
                ];
            }
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    for (const subscription of subscriptions) {
                        subscription.remove();
                    }
                    subscriptions = [];
                }
            };
        },
    };
}

const settledHeight = createKeyboardHeightStore("keyboardDidShow", "keyboardDidHide", () =>
    Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0
);

const arrivingHeight = createKeyboardHeightStore("keyboardWillShow", "keyboardWillHide", () => 0);

// `Did` events because Android never sends `keyboardWillShow`/`keyboardWillHide`.
export function useKeyboardHeight(): number {
    return useSyncExternalStore(settledHeight.subscribe, settledHeight.getSnapshot);
}

export function useArrivingKeyboardHeight(): number {
    return useSyncExternalStore(arrivingHeight.subscribe, arrivingHeight.getSnapshot);
}

export function useKeyboardEvent(name: KeyboardEventName, handler: (event: KeyboardEvent) => void) {
    useEventListener(
        (listener) => {
            const subscription = Keyboard.addListener(name, listener);
            return () => subscription.remove();
        },
        handler,
        [name]
    );
}

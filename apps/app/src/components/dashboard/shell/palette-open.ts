import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

export function setPaletteOpen(next: boolean) {
    open = next;
    for (const listener of listeners) {
        listener();
    }
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const usePaletteOpen = () =>
    useSyncExternalStore(
        subscribe,
        () => open,
        () => false
    );

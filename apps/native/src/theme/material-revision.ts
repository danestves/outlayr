import { useSyncExternalStore } from "react";

/*
 * Skips no-op writes (uniwind restyles everything on each `updateCSSVariables`) and keys `MaterialHost`'s Compose
 * `Host`, which reads the wallpaper palette only while composing.
 */

let revision = 0;
let applied = "";
const listeners = new Set<() => void>();

/** `signature` is any string that changes exactly when the scheme does. */
export function applyMaterialScheme(signature: string, write: () => void): void {
    if (signature === applied) {
        return;
    }
    write();
    applied = signature;
    revision += 1;
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

const currentRevision = () => revision;

export function useMaterialRevision(): number {
    return useSyncExternalStore(subscribe, currentRevision);
}

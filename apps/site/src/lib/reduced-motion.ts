import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
    const query = window.matchMedia(REDUCED_MOTION);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(REDUCED_MOTION).matches,
        () => true
    );
}

import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
    const query = window.matchMedia(WIDE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

export function useWide() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(WIDE).matches,
        () => true
    );
}

import { useSyncExternalStore } from "react";

import { useInView } from "@/lib/in-view";
import { useReducedMotion } from "@/lib/reduced-motion";

function subscribeVisibility(onChange: () => void) {
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
}

export function useAutoplay<T extends Element>() {
    const reduced = useReducedMotion();
    const pageVisible = useSyncExternalStore(
        subscribeVisibility,
        () => document.visibilityState === "visible",
        () => false
    );
    const { inView, ref } = useInView<T>();

    return { reduced, ref, running: inView && pageVisible && !reduced };
}

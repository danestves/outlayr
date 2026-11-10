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

const PHONE = "(max-width: 767px)";

function subscribePhone(onChange: () => void) {
    const query = window.matchMedia(PHONE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

/** Under the width the Insights tabs are drawn for, where the single phone screen stands in. */
export function usePhone() {
    return useSyncExternalStore(
        subscribePhone,
        () => window.matchMedia(PHONE).matches,
        () => false
    );
}

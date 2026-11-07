import { useRef, useSyncExternalStore } from "react";

export const ROW_HEIGHT = 51;
const ROWS_ABOVE = 20;
const ROWS_DRAWN = 100;
const STEP = 10;

export function rowWindow(hiddenAbove: number, count: number) {
    const wanted = Math.floor(hiddenAbove / ROW_HEIGHT) - ROWS_ABOVE;
    const first = count <= ROWS_DRAWN || wanted < STEP ? 0 : Math.floor(wanted / STEP) * STEP + 1;
    return { first: Math.min(first, Math.max(0, count - 1)), last: Math.min(first + ROWS_DRAWN, count) };
}

function subscribe(onChange: () => void) {
    document.addEventListener("scroll", onChange, { capture: true, passive: true });
    window.addEventListener("resize", onChange);
    return () => {
        document.removeEventListener("scroll", onChange, { capture: true });
        window.removeEventListener("resize", onChange);
    };
}

export function useRowWindow(count: number) {
    const body = useRef<HTMLTableSectionElement>(null);
    const first = useSyncExternalStore(
        subscribe,
        () => rowWindow(-(body.current?.getBoundingClientRect().top ?? 0), count).first,
        () => 0
    );
    return { body, first, last: Math.min(first + ROWS_DRAWN, count) };
}

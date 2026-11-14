import { useMemo, useRef, useSyncExternalStore } from "react";

export const ROW_HEIGHT = 51;

function subscribeScroll(onChange: () => void) {
    document.addEventListener("scroll", onChange, { capture: true, passive: true });
    window.addEventListener("resize", onChange);
    return () => {
        document.removeEventListener("scroll", onChange, { capture: true });
        window.removeEventListener("resize", onChange);
    };
}

// Scroll is read in steps so a fling re-renders the table every few rows, not every frame.
const STEP_PX = 600;
const OVERSCAN_PX = 1500;

/** Lines `[first, last)` to draw for a scroll position, plus the space the skipped lines above take. */
export function lineWindow(offsets: readonly number[], hiddenAbove: number, viewport: number) {
    const count = offsets.length - 1;
    const top = hiddenAbove - OVERSCAN_PX;
    const bottom = hiddenAbove + viewport + OVERSCAN_PX;
    let first = 0;
    let high = count;
    while (first < high) {
        const middle = Math.floor((first + high) / 2);
        if ((offsets[middle + 1] ?? 0) <= top) {
            first = middle + 1;
        } else {
            high = middle;
        }
    }
    let last = first;
    while (last < count && (offsets[last] ?? 0) < bottom) {
        last += 1;
    }
    return { first, last };
}

/** Windows a list of lines with fixed heights per line, scrolled by whatever scrolls the page. */
export function useLineWindow(heights: readonly number[]) {
    const body = useRef<HTMLTableSectionElement>(null);
    const offsets = useMemo(() => {
        const sums = [0];
        for (const height of heights) {
            sums.push((sums.at(-1) ?? 0) + height);
        }
        return sums;
    }, [heights]);
    const hiddenAbove = useSyncExternalStore(
        subscribeScroll,
        () => Math.max(0, Math.floor(-(body.current?.getBoundingClientRect().top ?? 0) / STEP_PX) * STEP_PX),
        () => 0
    );
    const viewport = useSyncExternalStore(
        subscribeScroll,
        () => window.innerHeight,
        () => 0
    );
    const { first, last } = lineWindow(offsets, hiddenAbove, viewport + STEP_PX);
    const total = offsets.at(-1) ?? 0;
    return {
        after: total - (offsets[last] ?? total),
        before: offsets[first] ?? 0,
        body,
        first,
        last,
    };
}

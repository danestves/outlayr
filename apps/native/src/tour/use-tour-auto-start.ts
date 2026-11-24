import { useIsFocused } from "expo-router";
import { useState } from "react";

import { useMirror, useTimers, useWhen } from "@/lib/lifecycle";

import { useTour } from "./tour-context";
import type { TourId } from "./tour-state";

const LOG_DELAY_MS = 800;
const SPOTLIGHT_DELAY_MS = 600;

export function useTourAutoStart(tour: TourId, ready: boolean): void {
    const { active, blocked, cancel, seen, start } = useTour();
    const focused = useIsFocused();
    const timers = useTimers();
    // One try per visit: a spotlight whose target can't be found waits for the next visit instead of retrying.
    const [tried, setTried] = useState(false);
    const unlocked = seen !== null && !seen.has(tour) && (tour === "log" || seen.has("log"));
    const armed = focused && ready && unlocked && !blocked && !tried && active === null;

    useWhen(armed, () =>
        timers.after(tour === "log" ? LOG_DELAY_MS : SPOTLIGHT_DELAY_MS, () => {
            setTried(true);
            start(tour);
        })
    );

    // Leaving mid-tour closes it unmarked, so the next visit starts the log tour from its first step again.
    useMirror([active?.tour, focused, blocked], () => {
        if (!focused || blocked) {
            cancel(tour);
            setTried(false);
        }
    });
}

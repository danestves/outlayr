import { addDays, startOfDay } from "@outlayr/money/calendar";

const DAY_MS = 86_400_000;

/** Milliseconds to the next local midnight, via the local calendar: DST days run 23 and 25 hours. */
export function nextClockTick(nowMs: number): number {
    const delay = addDays(startOfDay(new Date(nowMs)), 1).getTime() - nowMs;
    // A zone that repeats 00:00 can put the earlier midnight behind `nowMs`, and a zero delay would re-arm and spin.
    return delay > 0 ? delay : DAY_MS;
}

const CLOCK_REGRESSION_TOLERANCE_MS = 60_000;

/**
 * A repeat is refused, so a burst of triggers restates once. A small regression is jitter and is refused; a large
 * one is a real correction (NTP, the owner fixing the date) and must win, or a future bound reports scheduled
 * charges as already spent for the life of the process.
 */
export function clockAdvances(currentMs: number, candidateMs: number): boolean {
    if (candidateMs > currentMs) {
        return true;
    }
    return currentMs - candidateMs > CLOCK_REGRESSION_TOLERANCE_MS;
}

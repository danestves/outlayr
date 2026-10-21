import { openBrowserAsync } from "expo-web-browser";
import type { WebBrowserResult } from "expo-web-browser";

const HANDOFF_WINDOW_MS = 5000;

/**
 * Leaving a Custom Tab, the camera or a share sheet for Home sends no event of its own, so without a cap a detour
 * from the trip would leave the ledger unlocked indefinitely.
 */
export const HANDOFF_TRIP_CAP_MS = 2 * 60 * 1000;

let expectedAt: number | null = null;
let leftAt: number | null = null;
let runningSince: number | null = null;

/**
 * Call right before sending the user out without awaiting the result. On Android that backgrounds the app like
 * Home, and this mark is how the app lock tells them apart (`use-relock.android.ts`). iOS never reads it.
 */
export function expectHandoff(now: number = Date.now()): void {
    expectedAt = now;
}

/**
 * Every leave while `run` is pending counts, up to the trip cap, since a library pick leaves again for its crop
 * screen. The mark clears when `run` returns, so a trip that never left cannot excuse the next Home press.
 */
export async function duringHandoff<T>(run: () => Promise<T>): Promise<T> {
    expectHandoff();
    runningSince = Date.now();
    try {
        return await run();
    } finally {
        expectedAt = null;
        runningSince = null;
    }
}

export function takeHandoff(now: number = Date.now()): boolean {
    const announced = expectedAt !== null && now - expectedAt <= HANDOFF_WINDOW_MS;
    const awaited = runningSince !== null && now - runningSince <= HANDOFF_TRIP_CAP_MS;
    const expected = announced || awaited;
    expectedAt = null;
    leftAt = expected ? now : null;
    return expected;
}

export function handoffOverran(now: number = Date.now()): boolean {
    const overran = leftAt !== null && now - leftAt > HANDOFF_TRIP_CAP_MS;
    leftAt = null;
    return overran;
}

/** Announced first: on Android a Custom Tab is its own activity, and the call returns as soon as it opens. */
export function openInAppBrowser(url: string): Promise<WebBrowserResult> {
    expectHandoff();
    return openBrowserAsync(url);
}

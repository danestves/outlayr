import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import { getPendingResultAsync } from "expo-image-picker";

import { duringHandoff } from "@/lib/app-handoff";
import type { launchPick as iosLaunchPick, pendingPick as iosPendingPick } from "@/lib/pending-pick";
import { PendingPickError } from "@/lib/pending-pick-error";

/** On disk, since Android can kill the whole process while the camera is up. */
const PICK_MARK_KEY = "outlayr.pending-pick";

/** Long enough to restart under the camera; short enough that an abandoned pick doesn't spend a scan later. */
const PENDING_PICK_WINDOW_MS = 10 * 60 * 1000;

const stored = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({ catch: (cause) => new PendingPickError({ cause }), try: run });

export const launchPick: typeof iosLaunchPick = (owner, launch) =>
    Effect.acquireUseRelease(
        stored(() => AsyncStorage.setItem(PICK_MARK_KEY, `${owner}@${Date.now()}`)),
        () => duringHandoff(launch),
        () => stored(() => AsyncStorage.removeItem(PICK_MARK_KEY)).pipe(Effect.ignore)
    );

/**
 * Android can destroy the activity under the picker; the launch never resolves and the module holds the result
 * for one ask. Only the screen that launched the pick may take it.
 */
export const pendingPick: typeof iosPendingPick = Effect.fn("PendingPick.pendingPick")(function* pendingPick(owner) {
    const mark = yield* stored(() => AsyncStorage.getItem(PICK_MARK_KEY));
    const [markedOwner, launchedAt] = mark?.split("@") ?? [];
    if (markedOwner !== owner) {
        return null;
    }
    const result = yield* stored(() => getPendingResultAsync());
    if (result === null) {
        return null;
    }
    yield* stored(() => AsyncStorage.removeItem(PICK_MARK_KEY));
    const recent = Date.now() - Number(launchedAt) <= PENDING_PICK_WINDOW_MS;
    return recent && "canceled" in result ? result : null;
});

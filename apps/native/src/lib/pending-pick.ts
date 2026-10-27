import * as Effect from "effect/Effect";
import type { ImagePickerResult } from "expo-image-picker";

import { duringHandoff } from "@/lib/app-handoff";
import type { PendingPickError } from "@/lib/pending-pick-error";

export type PickOwner = "identity-picker" | "installment-scan" | "receipt-scan";

/**
 * Every system camera and library launch goes through here: the app lock hears about the trip out, and on Android
 * the owner is recorded first so a photo recovered after a teardown goes back to its screen (`pendingPick`).
 */
export const launchPick = <E, R>(
    _owner: PickOwner,
    launch: Effect.Effect<ImagePickerResult, E, R>
): Effect.Effect<ImagePickerResult, E | PendingPickError, R> => duringHandoff(launch);

/**
 * A photo picked for `owner` after the app was torn down under it. Call it when the owner's screen mounts.
 * iOS keeps the app alive behind its pickers, so there is never one to pick up.
 */
export const pendingPick = (_owner: PickOwner): Effect.Effect<ImagePickerResult | null, PendingPickError> =>
    Effect.succeed(null);

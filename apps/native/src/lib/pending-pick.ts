import type { ImagePickerResult } from "expo-image-picker";

import { duringHandoff } from "@/lib/app-handoff";

export type PickOwner = "identity-picker" | "installment-scan" | "receipt-scan";

/**
 * Every system camera and library launch goes through here: the app lock hears about the trip out, and on Android
 * the owner is recorded first so a photo recovered after a teardown goes back to its screen (`pendingPick`).
 */
export function launchPick(_owner: PickOwner, launch: () => Promise<ImagePickerResult>): Promise<ImagePickerResult> {
    return duringHandoff(launch);
}

/**
 * A photo picked for `owner` after the app was torn down under it. Call it when the owner's screen mounts.
 * iOS keeps the app alive behind its pickers, so there is never one to pick up.
 */
export async function pendingPick(_owner: PickOwner): Promise<ImagePickerResult | null> {
    return null;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingResultAsync } from "expo-image-picker";

import { duringHandoff } from "@/lib/app-handoff";
import type { launchPick as iosLaunchPick, pendingPick as iosPendingPick } from "@/lib/pending-pick";

/** On disk, since Android can kill the whole process while the camera is up. */
const PICK_MARK_KEY = "outlayr.pending-pick";

/** Long enough to restart under the camera; short enough that an abandoned pick doesn't spend a scan later. */
const PENDING_PICK_WINDOW_MS = 10 * 60 * 1000;

export const launchPick: typeof iosLaunchPick = async (owner, launch) => {
    await AsyncStorage.setItem(PICK_MARK_KEY, `${owner}@${Date.now()}`);
    try {
        return await duringHandoff(launch);
    } finally {
        await AsyncStorage.removeItem(PICK_MARK_KEY).catch(() => undefined);
    }
};

/**
 * Android can destroy the activity under the picker; the launch never resolves and the module holds the result
 * for one ask. Only the screen that launched the pick may take it.
 */
export const pendingPick: typeof iosPendingPick = async (owner) => {
    const mark = await AsyncStorage.getItem(PICK_MARK_KEY);
    const [markedOwner, launchedAt] = mark?.split("@") ?? [];
    if (markedOwner !== owner) {
        return null;
    }
    const result = await getPendingResultAsync();
    if (result === null) {
        return null;
    }
    await AsyncStorage.removeItem(PICK_MARK_KEY);
    const recent = Date.now() - Number(launchedAt) <= PENDING_PICK_WINDOW_MS;
    return recent && "canceled" in result ? result : null;
};

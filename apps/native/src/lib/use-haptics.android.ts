import { AndroidHaptics, performAndroidHapticsAsync } from "expo-haptics";
import { useCallback } from "react";
import { Platform } from "react-native";

import { useLocalData } from "@/contexts/local-data-context";
import { useNumberSetting } from "@/data/settings";
import { hapticPlay } from "@/domain/haptics";
import type { HapticEvent, HapticPlay } from "@/domain/haptics";
import type { useHaptics as iosUseHaptics } from "@/lib/use-haptics";

/** The API levels that added `Confirm`/`Reject` and `Segment_Tick`; older devices reject them. */
const CONFIRM_REJECT_API = 30;
const SEGMENT_TICK_API = 34;

const IMPACT = {
    heavy: AndroidHaptics.Long_Press,
    light: AndroidHaptics.Virtual_Key,
    medium: AndroidHaptics.Context_Click,
} as const;

/** Constants newer than the device fall back to the closest one every version has. */
function androidHapticFor(play: HapticPlay, event: HapticEvent, api: number): AndroidHaptics {
    switch (play.kind) {
        case "selection": {
            if (event === "keyTap") {
                return AndroidHaptics.Keyboard_Tap;
            }
            return api >= SEGMENT_TICK_API ? AndroidHaptics.Segment_Tick : AndroidHaptics.Clock_Tick;
        }
        case "impact": {
            return IMPACT[play.style];
        }
        case "notification": {
            if (play.type === "success") {
                return api >= CONFIRM_REJECT_API ? AndroidHaptics.Confirm : AndroidHaptics.Context_Click;
            }
            return api >= CONFIRM_REJECT_API ? AndroidHaptics.Reject : AndroidHaptics.Long_Press;
        }
        default: {
            const unhandled: never = play;
            throw new Error(`Unhandled haptic play: ${JSON.stringify(unhandled)}`);
        }
    }
}

/** See `use-haptics.ts` for why `db` is nullable and unread means silent. */
function useHapticsLevel(): number | null {
    const { db } = useLocalData();
    const level = useNumberSetting(db, "haptics");
    return db === null ? null : level;
}

/** `impactAsync` and `notificationAsync` fall back to timed Vibrator patterns on Android, which buzz, not tap. */
export const useHaptics: typeof iosUseHaptics = () => {
    const level = useHapticsLevel();

    return useCallback(
        (event: HapticEvent) => {
            if (level === null) {
                return;
            }
            const play = hapticPlay(level, event);
            if (play === null) {
                return;
            }
            performAndroidHapticsAsync(androidHapticFor(play, event, Number(Platform.Version))).catch(() => undefined);
        },
        [level]
    );
};

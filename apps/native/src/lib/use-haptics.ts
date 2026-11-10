import {
    ImpactFeedbackStyle,
    impactAsync,
    NotificationFeedbackType,
    notificationAsync,
    selectionAsync,
} from "expo-haptics";

import { useLocalData } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import { hapticPlay } from "@/domain/haptics";
import type { HapticEvent } from "@/domain/haptics";

const IMPACT = {
    heavy: ImpactFeedbackStyle.Heavy,
    light: ImpactFeedbackStyle.Light,
    medium: ImpactFeedbackStyle.Medium,
} as const;

const NOTIFICATION = {
    error: NotificationFeedbackType.Error,
    success: NotificationFeedbackType.Success,
    warning: NotificationFeedbackType.Warning,
} as const;

/**
 * Nullable `db`: a caller above the splash gate, where `useDatabase()` throws, gets null. Null resolves to silence,
 * never the default, which is why this is not `useSetting`.
 */
function useHapticsLevel(): number | null {
    const { db } = useLocalData();
    const level = useMeta(db, "haptics");
    return db === null ? null : level;
}

/** The only route to the taptic engine: `expo-haptics` is import-banned everywhere else (oxlint.config.ts). */
export function useHaptics(): (event: HapticEvent) => void {
    const level = useHapticsLevel();

    return (event: HapticEvent) => {
        if (level === null) {
            return;
        }
        const play = hapticPlay(level, event);
        if (play === null) {
            return;
        }
        switch (play.kind) {
            case "selection": {
                void selectionAsync();
                return;
            }
            case "impact": {
                void impactAsync(IMPACT[play.style]);
                return;
            }
            case "notification": {
                void notificationAsync(NOTIFICATION[play.type]);
                return;
            }
            default: {
                const unhandled: never = play;
                throw new Error(`Unhandled haptic play: ${JSON.stringify(unhandled)}`);
            }
        }
    };
}

export const HAPTICS_OFF = 0;
export const HAPTICS_SUBTLE = 1;
export const HAPTICS_EXCESSIVE = 2;

export type HapticEvent = "selection" | "keyTap" | "light" | "medium" | "heavy" | "success" | "warning" | "error";

export type HapticPlay =
    | { kind: "selection" }
    | { kind: "impact"; style: "light" | "medium" | "heavy" }
    | { kind: "notification"; type: "success" | "warning" | "error" };

export function hapticPlay(level: number, event: HapticEvent): HapticPlay | null {
    if (level < HAPTICS_SUBTLE) {
        return null;
    }
    switch (event) {
        case "selection":
        case "keyTap": {
            return level >= HAPTICS_EXCESSIVE ? { kind: "selection" } : null;
        }
        case "light":
        case "medium":
        case "heavy": {
            return { kind: "impact", style: event };
        }
        case "success":
        case "warning":
        case "error": {
            return { kind: "notification", type: event };
        }
        default: {
            const unhandled: never = event;
            throw new Error(`Unhandled haptic event: ${String(unhandled)}`);
        }
    }
}

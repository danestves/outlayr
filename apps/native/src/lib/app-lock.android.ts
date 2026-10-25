import { authenticateAsync, cancelAuthenticate, getEnrolledLevelAsync, SecurityLevel } from "expo-local-authentication";
import { AppState } from "react-native";

import type { lockIsEnforceable as iosLockIsEnforceable, requestUnlock as iosRequestUnlock } from "@/lib/app-lock";
import { untilActive } from "@/lib/until-active";

const UNANSWERED_AFTER_RETURN_MS = 1000;

export const lockIsEnforceable: typeof iosLockIsEnforceable = async () => {
    try {
        return (await getEnrolledLevelAsync()) !== SecurityLevel.NONE;
    } catch {
        return false;
    }
};

export const requestUnlock: typeof iosRequestUnlock = async (promptMessage) => {
    await untilActive();
    let unanswered: ReturnType<typeof setTimeout> | undefined;
    const returning = AppState.addEventListener("change", (phase) => {
        if (phase === "active") {
            unanswered = setTimeout(() => {
                cancelAuthenticate().catch(() => undefined);
            }, UNANSWERED_AFTER_RETURN_MS);
        }
    });
    try {
        return await authenticateAsync({ disableDeviceFallback: false, promptMessage });
    } catch {
        return { error: "unknown", success: false };
    } finally {
        returning.remove();
        clearTimeout(unanswered);
    }
};

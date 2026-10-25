import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from "expo-local-authentication";
import type { LocalAuthenticationResult } from "expo-local-authentication";

import { untilActive } from "@/lib/until-active";

/** Nothing enrolled means no credential can open the gate, so enforcing it would lock the owner out of local data. */
export async function lockIsEnforceable(): Promise<boolean> {
    try {
        return (await getEnrolledLevelAsync()) !== SecurityLevel.NONE;
    } catch {
        return false;
    }
}

// LocalAuthentication cancels a prompt asked for in the background, which would spend the gate's one automatic
// prompt on a relock before the person is back.
export async function requestUnlock(promptMessage: string): Promise<LocalAuthenticationResult> {
    await untilActive();
    try {
        return await authenticateAsync({
            // Off, a failed or locked-out sensor has no passcode fallback and the lock becomes unopenable.
            disableDeviceFallback: false,
            promptMessage,
        });
    } catch {
        return { error: "unknown", success: false };
    }
}

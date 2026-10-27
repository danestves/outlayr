import * as Effect from "effect/Effect";
import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from "expo-local-authentication";
import type { LocalAuthenticationResult } from "expo-local-authentication";

import { untilActive } from "@/lib/until-active";

/** Nothing enrolled means no credential can open the gate, so enforcing it would lock the owner out of local data. */
export const lockIsEnforceable = Effect.fn("AppLock.lockIsEnforceable")(function* lockIsEnforceable() {
    return yield* Effect.tryPromise(() => getEnrolledLevelAsync()).pipe(
        Effect.map((level) => level !== SecurityLevel.NONE),
        Effect.catchTags({ UnknownError: () => Effect.succeed(false) })
    );
});

// LocalAuthentication cancels a prompt asked for in the background, which would spend the gate's one automatic
// prompt on a relock before the person is back.
export const requestUnlock = Effect.fn("AppLock.requestUnlock")(function* requestUnlock(promptMessage: string) {
    yield* untilActive();
    return yield* Effect.tryPromise(() =>
        authenticateAsync({
            // Off, a failed or locked-out sensor has no passcode fallback and the lock becomes unopenable.
            disableDeviceFallback: false,
            promptMessage,
        })
    ).pipe(
        Effect.catchTags({
            UnknownError: () => Effect.succeed<LocalAuthenticationResult>({ error: "unknown", success: false }),
        })
    );
});

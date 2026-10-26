import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { authenticateAsync, cancelAuthenticate, getEnrolledLevelAsync, SecurityLevel } from "expo-local-authentication";
import type { LocalAuthenticationResult } from "expo-local-authentication";

import { appStates, WatchAppState } from "@/lib/app-events";
import type { lockIsEnforceable as iosLockIsEnforceable, requestUnlock as iosRequestUnlock } from "@/lib/app-lock";
import { untilActive } from "@/lib/until-active";

const UNANSWERED_AFTER_RETURN = Duration.seconds(1);

export const lockIsEnforceable: typeof iosLockIsEnforceable = Effect.fn("AppLock.lockIsEnforceable")(
    function* lockIsEnforceable() {
        return yield* Effect.tryPromise(() => getEnrolledLevelAsync()).pipe(
            Effect.map((level) => level !== SecurityLevel.NONE),
            Effect.catchTags({ UnknownError: () => Effect.succeed(false) })
        );
    }
);

export const requestUnlock: typeof iosRequestUnlock = Effect.fn("AppLock.requestUnlock")(function* requestUnlock(
    promptMessage: string
) {
    yield* untilActive();
    const watchAppState = yield* WatchAppState;
    const cancelWhenUnanswered = appStates(watchAppState, "active").pipe(
        Stream.mapEffect(
            () =>
                Effect.sleep(UNANSWERED_AFTER_RETURN).pipe(
                    Effect.andThen(Effect.tryPromise(() => cancelAuthenticate())),
                    Effect.catchTags({ UnknownError: () => Effect.void })
                ),
            { concurrency: "unbounded" }
        ),
        Stream.runDrain
    );
    return yield* Effect.scoped(
        Effect.gen(function* authenticate() {
            yield* Effect.forkScoped(cancelWhenUnanswered);
            return yield* Effect.tryPromise(() =>
                authenticateAsync({ disableDeviceFallback: false, promptMessage })
            ).pipe(
                Effect.catchTags({
                    UnknownError: () => Effect.succeed<LocalAuthenticationResult>({ error: "unknown", success: false }),
                })
            );
        })
    );
});

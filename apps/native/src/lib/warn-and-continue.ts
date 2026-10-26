import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

export const warnAndContinue =
    (message: string) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
            Effect.catchCause((cause) => Effect.logWarning(message, Cause.squash(cause)).pipe(Effect.as(undefined)))
        );

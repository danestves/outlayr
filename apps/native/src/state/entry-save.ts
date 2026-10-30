import * as Effect from "effect/Effect";

export const logged =
    (message: string) =>
    <R>(step: Effect.Effect<unknown, unknown, R>) =>
        step.pipe(
            Effect.asVoid,
            Effect.catchCause((cause) => Effect.logError(message, cause))
        );

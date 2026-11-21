import * as Effect from "effect/Effect";

export const logged =
    (message: string) =>
    <A, E, R>(step: Effect.Effect<A, E, R>) =>
        step.pipe(
            Effect.asVoid,
            Effect.catchCause((cause) => Effect.logError(message, cause))
        );

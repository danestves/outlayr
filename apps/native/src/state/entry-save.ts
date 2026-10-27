import * as Effect from "effect/Effect";

type Step<R> = Effect.Effect<unknown, unknown, R>;

export interface SavedEntryPlan<R = never> {
    backfill: Step<R> | null;
    carry: Step<R> | null;
    queueLookup: Step<R> | null;
    rememberAccount: Step<R> | null;
    syncReminders: Step<R>;
}

export const logged =
    (message: string) =>
    <R>(step: Step<R>) =>
        step.pipe(
            Effect.asVoid,
            Effect.catchCause((cause) => Effect.logError(message, cause))
        );

const detached = <R>(message: string, step: Step<R>) => Effect.forkDetach(logged(message)(step));

export const commitSavedEntry = Effect.fn("EntrySave.commit")(function* commitSavedEntry<R>(plan: SavedEntryPlan<R>) {
    if (plan.rememberAccount !== null) {
        yield* logged("Failed to remember the account")(plan.rememberAccount);
    }
    if (plan.queueLookup !== null) {
        yield* detached("Failed to queue the merchant lookup", plan.queueLookup);
    }
    if (plan.carry !== null) {
        yield* detached("Failed to carry the merchant lookup to its other rows", plan.carry);
    }
    let scheduleFailed = false;
    if (plan.backfill !== null) {
        scheduleFailed = yield* plan.backfill.pipe(
            Effect.as(false),
            Effect.catchCause((cause) =>
                Effect.logError("Failed to back-fill the subscription", cause).pipe(Effect.as(true))
            )
        );
    }
    yield* detached("Subscription reminder sync failed", plan.syncReminders);
    return { scheduleFailed };
});

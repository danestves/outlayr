import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";

export interface AdoptionRetry {
    run: <E, R>(reconcile: Effect.Effect<void, E, R>) => Effect.Effect<boolean, E, R>;
    schedule: () => void;
}

export function createSingleAdoptionRetry(): AdoptionRetry {
    let pending = false;
    let used = false;

    return {
        run: (reconcile) =>
            Effect.suspend(() => {
                if (!pending || used) {
                    return Effect.succeed(false);
                }
                pending = false;
                used = true;
                return Effect.as(reconcile, true);
            }),
        schedule() {
            if (!used) {
                pending = true;
            }
        },
    };
}

export type AdoptionOutcome = "ask" | "defer" | "settled";
export type ReconciledStatus = "ask" | "settled";

export interface AdoptionSlot {
    readonly accountId: string;
    inFlight: Deferred.Deferred<ReconciledStatus> | null;
    readonly retry: AdoptionRetry;
}

export const createAdoptionSlot = (accountId: string): AdoptionSlot => ({
    accountId,
    inFlight: null,
    retry: createSingleAdoptionRetry(),
});

export const reconcileOnce = Effect.fn("AdoptionRetry.reconcileOnce")(function* reconcileOnce<E, R>(
    slot: AdoptionSlot,
    reconcile: Effect.Effect<AdoptionOutcome, E, R>
) {
    if (slot.inFlight !== null) {
        return yield* Deferred.await(slot.inFlight);
    }
    const done = yield* Deferred.make<ReconciledStatus>();
    slot.inFlight = done;
    return yield* reconcile.pipe(
        Effect.tap((outcome) => (outcome === "defer" ? Effect.sync(slot.retry.schedule) : Effect.void)),
        Effect.map((outcome): ReconciledStatus => (outcome === "ask" ? "ask" : "settled")),
        Effect.catchCause((cause) =>
            Effect.logWarning("[outlayr] ledger adoption deferred", Cause.pretty(cause)).pipe(
                Effect.andThen(Effect.sync(slot.retry.schedule)),
                Effect.as<ReconciledStatus>("settled")
            )
        ),
        Effect.onExit((exit) =>
            Effect.sync(() => {
                slot.inFlight = null;
            }).pipe(Effect.andThen(Deferred.done(done, exit)))
        )
    );
});

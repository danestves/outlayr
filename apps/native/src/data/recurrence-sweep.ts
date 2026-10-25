import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import type { Database } from "@/db/client";
import { launchAndForegrounds, WatchAppState } from "@/lib/app-events";

import { backfillAllRecurring, repairOrphanedRecurrence } from "./recurrence-backfill";

const SWEEP_COOLDOWN_MS = 60_000;

const SweepStep = Schema.Literals(["backfill", "repair"]);

export class RecurrenceSweepError extends Schema.TaggedError<RecurrenceSweepError>()("RecurrenceSweepError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: SweepStep,
}) {}

export const RecurrenceWalk = Context.Reference<{
    readonly backfill: (db: Database) => Promise<void>;
    readonly repair: (db: Database) => Promise<number>;
}>("outlayr/data/RecurrenceSweep/RecurrenceWalk", {
    defaultValue: () => ({
        backfill: (db) => backfillAllRecurring(db),
        repair: (db) => repairOrphanedRecurrence(db),
    }),
});

/**
 * At the root because the generated rows feed Budgets and Insights too. `onSwept` runs after the walk commits,
 * even inside the cooldown or after a failure: a reader firing on the same foreground event would race the sweep
 * and see a landing it is about to invalidate.
 */
export class RecurrenceSweep extends Context.Service<
    RecurrenceSweep,
    { readonly run: <R>(db: Database, onSwept: Effect.Effect<void, never, R>) => Effect.Effect<void, never, R> }
>()("outlayr/data/RecurrenceSweep") {}

const attempt = <A>(step: typeof SweepStep.Type, task: () => Promise<A>) =>
    Effect.tryPromise({
        catch: (cause) => new RecurrenceSweepError({ cause, message: "Recurrence sweep failed", step }),
        try: task,
    });

export const make = Effect.gen(function* make() {
    const walk = yield* RecurrenceWalk;
    const watchAppState = yield* WatchAppState;

    const run = Effect.fn("RecurrenceSweep.run")(function* run<R>(
        db: Database,
        onSwept: Effect.Effect<void, never, R>
    ) {
        const lastSweepAt = yield* Ref.make(0);

        const sweep = Effect.gen(function* sweep() {
            const startedAt = yield* Clock.currentTimeMillis;
            if (startedAt - (yield* Ref.get(lastSweepAt)) < SWEEP_COOLDOWN_MS) {
                return;
            }
            yield* Ref.set(lastSweepAt, startedAt);
            // Repair first so a chain reinstated on this launch is swept on it too.
            yield* attempt("repair", () => walk.repair(db));
            yield* attempt("backfill", () => walk.backfill(db));
        }).pipe(
            Effect.catchTags({
                RecurrenceSweepError: (error) =>
                    Ref.set(lastSweepAt, 0).pipe(Effect.andThen(Effect.logError(error.message, error.cause))),
            }),
            Effect.uninterruptible
        );

        yield* launchAndForegrounds(watchAppState).pipe(Stream.runForEach(() => sweep.pipe(Effect.andThen(onSwept))));
    });

    return RecurrenceSweep.of({ run });
});

export const layer = Layer.effect(RecurrenceSweep, make);

import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import { META_KEYS } from "@/data/app-meta-core";
import { subscribeToSettingChanges } from "@/data/database-changes";
import type { Database } from "@/db/client";

import { launchAndForegrounds, listen, signals, WatchAppState, WatchTableWrites } from "./app-events";
import { freshEntries } from "./fresh-entries";
import { PUBLISH_DEBOUNCE_MS } from "./sync-cadence";

const DAILY_REMINDER_SETTINGS = [
    "showNotifications",
    "hideAmounts",
    "notificationOption",
    "notificationHour",
    "notificationMinute",
    META_KEYS.currency,
] as const;

const RESYNC_DEBOUNCE = Duration.millis(PUBLISH_DEBOUNCE_MS);

const DailyReminderStep = Schema.Literals(["arm", "sync"]);

const FAILED: Record<typeof DailyReminderStep.Type, string> = {
    arm: "Arming the chosen reminder failed",
    sync: "Daily reminder sync failed",
};

export class DailyReminderError extends Schema.TaggedError<DailyReminderError>()("DailyReminderError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: DailyReminderStep,
}) {}

export class DailyReminderSteps extends Context.Service<
    DailyReminderSteps,
    Record<typeof DailyReminderStep.Type, (db: Database) => Effect.Effect<void, Error>>
>()("outlayr/lib/DailyReminderSync/DailyReminderSteps") {}

export class DailyReminderSync extends Context.Service<
    DailyReminderSync,
    { readonly run: (db: Database) => Effect.Effect<void, never, DailyReminderSteps> }
>()("outlayr/lib/DailyReminderSync") {}

export const make = Effect.gen(function* make() {
    const watchAppState = yield* WatchAppState;
    const watchTableWrites = yield* WatchTableWrites;
    const inFlight = yield* Semaphore.make(1);

    const run = Effect.fn("DailyReminderSync.run")(function* run(db: Database) {
        const steps = yield* DailyReminderSteps;
        const attempt = (step: typeof DailyReminderStep.Type) =>
            steps[step](db).pipe(
                Effect.mapError((cause) => new DailyReminderError({ cause, message: FAILED[step], step })),
                Effect.catchDefect((defect) =>
                    Effect.fail(new DailyReminderError({ cause: defect, message: FAILED[step], step }))
                ),
                Effect.catchTags({ DailyReminderError: (error) => Effect.logError(error.message, error.cause) })
            );
        const sync = attempt("sync").pipe(Effect.uninterruptible, inFlight.withPermits(1));

        const resyncs = Stream.merge(
            listen(watchTableWrites, (tableName) => tableName === "transactions"),
            signals((listener) => subscribeToSettingChanges(db, listener, DAILY_REMINDER_SETTINGS))
        ).pipe(Stream.debounce(RESYNC_DEBOUNCE));
        const syncs = Stream.merge(launchAndForegrounds(watchAppState), resyncs).pipe(
            Stream.buffer({ capacity: 1, strategy: "sliding" }),
            Stream.runForEach(() => sync)
        );

        // Only an in-app create marks `freshEntries` (never a sync pull, adoption or backfill), so the reminder
        // prompt cannot land mid-sign-in.
        const arms = signals(freshEntries.subscribe).pipe(
            Stream.debounce(RESYNC_DEBOUNCE),
            Stream.runForEach(() => attempt("arm"))
        );

        yield* Effect.all([syncs, arms], { concurrency: "unbounded", discard: true });
    });

    return DailyReminderSync.of({ run });
});

export const layer = Layer.effect(DailyReminderSync, make);

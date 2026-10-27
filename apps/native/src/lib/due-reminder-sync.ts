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

import { signals } from "./app-events";
import { PUBLISH_DEBOUNCE_MS } from "./sync-cadence";

const DUE_REMINDER_SETTINGS = [
    "subscriptionReminders",
    "installmentReminders",
    "hideAmounts",
    "notificationOption",
    "notificationHour",
    "notificationMinute",
    META_KEYS.currency,
] as const;

const RESYNC_DEBOUNCE = Duration.millis(PUBLISH_DEBOUNCE_MS);

const DueReminder = Schema.Literals(["installment", "subscription"]);

const FAILED: Record<typeof DueReminder.Type, string> = {
    installment: "Installment reminder sync failed",
    subscription: "Subscription reminder sync failed",
};

export class DueReminderError extends Schema.TaggedError<DueReminderError>()("DueReminderError", {
    cause: Schema.Defect(),
    message: Schema.String,
    reminder: DueReminder,
}) {}

export class DueReminderPasses extends Context.Service<
    DueReminderPasses,
    Record<typeof DueReminder.Type, (db: Database) => Effect.Effect<void, Error>>
>()("outlayr/lib/DueReminderSync/DueReminderPasses") {}

export class DueReminderSync extends Context.Service<
    DueReminderSync,
    {
        readonly reconcile: (db: Database) => Effect.Effect<void, never, DueReminderPasses>;
        readonly run: (db: Database) => Effect.Effect<void, never, DueReminderPasses>;
    }
>()("outlayr/lib/DueReminderSync") {}

const attempt = (reminder: typeof DueReminder.Type, db: Database) =>
    DueReminderPasses.pipe(
        Effect.flatMap((passes) =>
            passes[reminder](db).pipe(
                Effect.mapError((cause) => new DueReminderError({ cause, message: FAILED[reminder], reminder })),
                Effect.catchDefect((defect) =>
                    Effect.fail(new DueReminderError({ cause: defect, message: FAILED[reminder], reminder }))
                )
            )
        ),
        Effect.catchTags({ DueReminderError: (error) => Effect.logError(error.message, error.cause) })
    );

export const make = Effect.gen(function* make() {
    const inFlight = yield* Semaphore.make(1);

    // Cuotas take the headroom the subscription notices leave, so they wait for that pass. Whole passes chain, or
    // one pass's cuotas could count the queue while another's subscriptions are mid re-arm.
    const reconcile = Effect.fn("DueReminderSync.reconcile")(function* reconcile(db: Database) {
        yield* attempt("subscription", db).pipe(
            Effect.andThen(attempt("installment", db)),
            Effect.uninterruptible,
            inFlight.withPermits(1)
        );
    });

    const run = Effect.fn("DueReminderSync.run")(function* run(db: Database) {
        yield* signals((listener) => subscribeToSettingChanges(db, listener, DUE_REMINDER_SETTINGS)).pipe(
            Stream.debounce(RESYNC_DEBOUNCE),
            Stream.runForEach(() => reconcile(db))
        );
    });

    return DueReminderSync.of({ reconcile, run });
});

export const layer = Layer.effect(DueReminderSync, make);

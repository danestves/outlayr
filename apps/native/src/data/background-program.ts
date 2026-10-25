import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";

import type { Database } from "@/db/client";
import { DailyReminderSync } from "@/lib/daily-reminder-sync";
import type { DailyReminderSteps } from "@/lib/daily-reminder-sync";
import { DueReminderSync } from "@/lib/due-reminder-sync";
import type { DueReminderPasses } from "@/lib/due-reminder-sync";
import { SystemSync } from "@/lib/system-sync";
import type { SystemSurfaces } from "@/lib/system-sync";

import { RecurrenceSweep } from "./recurrence-sweep";

export class BackgroundProgram extends Context.Service<
    BackgroundProgram,
    {
        readonly run: (
            db: Database
        ) => Effect.Effect<void, never, DailyReminderSteps | DueReminderPasses | SystemSurfaces>;
    }
>()("outlayr/data/BackgroundProgram") {}

export const make = Effect.gen(function* make() {
    const dailyReminders = yield* DailyReminderSync;
    const dueReminders = yield* DueReminderSync;
    const sweep = yield* RecurrenceSweep;
    const system = yield* SystemSync;

    const run = Effect.fn("BackgroundProgram.run")(function* run(db: Database) {
        const swept = yield* Queue.sliding<undefined>(1);
        yield* Effect.all(
            [
                dailyReminders.run(db),
                // The sweep moves the landing the notices are dated from, so due reminders reconcile from its
                // callback.
                sweep.run(db, Queue.offer(swept, undefined).pipe(Effect.andThen(dueReminders.reconcile(db)))),
                dueReminders.run(db),
                // After the sweep, so a subscription that advanced this foreground is in the table when the widgets
                // rebuild.
                system.run(db, Stream.fromQueue(swept)),
            ],
            { concurrency: "unbounded", discard: true }
        );
    });

    return BackgroundProgram.of({ run });
});

export const layer = Layer.effect(BackgroundProgram, make);

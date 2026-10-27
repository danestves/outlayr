import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";

import { readBoolSetting, setBoolSetting } from "@/data/settings-core";
import { pendingReminderPlan } from "@/data/subscription-reminders-core";
import type { Database } from "@/db/client";
import { reminderReconcile } from "@/domain/reminder";
import { orphanedReminderIds } from "@/domain/subscription-reminder";
import { reminderNotices } from "@/domain/subscription-reminder-copy";

import { armReminders, readReminderTime } from "./reminder-sync";
import { Reminders } from "./reminders";

const reconcileSubscriptionReminders = Effect.fn("SubscriptionReminderSync.reconcile")(
    function* reconcileSubscriptionReminders(db: Database) {
        const reminders = yield* Reminders;
        const [enabled, permission, hideAmounts] = yield* Effect.all(
            [readBoolSetting(db, "subscriptionReminders"), reminders.permission(), readBoolSetting(db, "hideAmounts")],
            { concurrency: "unbounded" }
        );
        if (enabled && permission === "unknown") {
            return;
        }
        const decision = reminderReconcile(enabled, permission);
        const notices =
            decision === "schedule"
                ? reminderNotices(yield* pendingReminderPlan(db, new Date(), yield* readReminderTime(db)), hideAmounts)
                : [];

        yield* reminders.cancel(
            orphanedReminderIds(
                notices.map((notice) => notice.id),
                yield* reminders.pendingIds()
            )
        );
        yield* armReminders(notices);

        if (decision === "disable") {
            yield* setBoolSetting(db, "subscriptionReminders", false);
        }
    }
);

/** One pass at a time: overlapping passes interleave cancels and schedules, so one can cancel what the other armed. */
const inFlight = Semaphore.makeUnsafe(1);

/**
 * Every arm is recomputed from the ledger: a chain's next landing moves on each backfill, and a restore carries
 * the rows but not the requests. Cancellation runs whatever the switch says, so turning it off silences iOS.
 */
export const syncSubscriptionReminders = Effect.fn("SubscriptionReminderSync.sync")(function* syncSubscriptionReminders(
    db: Database
) {
    yield* reconcileSubscriptionReminders(db).pipe(inFlight.withPermits(1));
});

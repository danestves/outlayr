import { readBoolSetting, setBoolSetting } from "@/data/settings-core";
import { pendingReminderPlan } from "@/data/subscription-reminders-core";
import type { Database } from "@/db/client";
import { reminderReconcile } from "@/domain/reminder";
import { orphanedReminderIds } from "@/domain/subscription-reminder";
import { reminderNotices } from "@/domain/subscription-reminder-copy";

import { readReminderTime } from "./reminder-sync";
import { cancelReminders, pendingReminderIds, reminderPermission, scheduleDatedReminder } from "./reminders";

/**
 * Every arm is recomputed from the ledger: a chain's next landing moves on each backfill, and a restore carries
 * the rows but not the requests. Cancellation runs whatever the switch says, so turning it off silences iOS.
 */
export function syncSubscriptionReminders(db: Database): Promise<void> {
    const run = queue.then(() => reconcileSubscriptionReminders(db));
    queue = run.catch(() => {
        // Swallowed so one failed sync does not poison the queue.
    });
    return run;
}

/** One pass at a time: overlapping passes interleave cancels and schedules, so one can cancel what the other armed. */
let queue: Promise<unknown> = Promise.resolve();

async function reconcileSubscriptionReminders(db: Database): Promise<void> {
    const [enabled, permission, hideAmounts] = await Promise.all([
        readBoolSetting(db, "subscriptionReminders"),
        reminderPermission(),
        readBoolSetting(db, "hideAmounts"),
    ]);
    if (enabled && permission === "unknown") {
        return;
    }
    const decision = reminderReconcile(enabled, permission);
    const notices =
        decision === "schedule"
            ? reminderNotices(await pendingReminderPlan(db, new Date(), await readReminderTime(db)), hideAmounts)
            : [];

    await cancelReminders(
        orphanedReminderIds(
            notices.map((notice) => notice.id),
            await pendingReminderIds()
        )
    );

    for (const notice of notices) {
        // oxlint-disable-next-line no-await-in-loop -- arming mutates the one shared iOS notification queue, which is why `cancelReminders` (lib/reminders.ts) walks it serially too
        await scheduleDatedReminder(notice);
    }

    if (decision === "disable") {
        await setBoolSetting(db, "subscriptionReminders", false);
    }
}

import * as Effect from "effect/Effect";

import { readBoolSetting, readNumberSetting, setBoolSetting } from "@/data/settings-core";
import { lastLoggedEntry } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import {
    clampTimeOfDay,
    DAILY_REMINDER_PREFIX,
    dailyReminderNotices,
    reminderReconcile,
    reminderTime,
} from "@/domain/reminder";

import { Reminders } from "./reminders";
import type { DatedReminder } from "./reminders";

export const readReminderTime = Effect.fn("ReminderSync.readReminderTime")(function* readReminderTime(db: Database) {
    const [option, hour, minute] = yield* Effect.all(
        [
            readNumberSetting(db, "notificationOption"),
            readNumberSetting(db, "notificationHour"),
            readNumberSetting(db, "notificationMinute"),
        ],
        { concurrency: "unbounded" }
    );
    return reminderTime(option, clampTimeOfDay(hour, minute));
});

// Arming mutates the one shared iOS notification queue, which is why `cancel` (lib/reminders.ts) walks it serially too.
export const armReminders = Effect.fn("ReminderSync.armReminders")(function* armReminders(
    notices: readonly DatedReminder[]
) {
    const reminders = yield* Reminders;
    for (const notice of notices) {
        yield* reminders.schedule(notice);
    }
});

export const reconcileDailyReminder = Effect.fn("ReminderSync.reconcileDailyReminder")(function* reconcileDailyReminder(
    db: Database
) {
    const reminders = yield* Reminders;
    const [enabled, permission, hideAmounts] = yield* Effect.all(
        [readBoolSetting(db, "showNotifications"), reminders.permission(), readBoolSetting(db, "hideAmounts")],
        { concurrency: "unbounded" }
    );
    if (enabled && permission === "unknown") {
        return;
    }
    const decision = reminderReconcile(enabled, permission);
    const now = new Date();
    const notices =
        decision === "schedule"
            ? dailyReminderNotices({
                  hideAmounts,
                  last: yield* lastLoggedEntry(db, now),
                  now,
                  time: yield* readReminderTime(db),
              })
            : [];

    const keep = new Set(notices.map((notice) => notice.id));
    const pending = yield* reminders.pendingIds();
    yield* reminders.cancel(pending.filter((id) => id.startsWith(DAILY_REMINDER_PREFIX) && !keep.has(id)));
    yield* armReminders(notices);

    if (decision === "disable") {
        yield* setBoolSetting(db, "showNotifications", false);
    }
});

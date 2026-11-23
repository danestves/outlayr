import { addMonths, firstOfMonth } from "@outlayr/money/calendar";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { Meta } from "@/data/app-meta-core";
import { hasEntriesBetween, lastLoggedEntry, visibleEntryCount } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { previousMonth } from "@/domain/recap-month";
import {
    clampTimeOfDay,
    DAILY_REMINDER_PREFIX,
    dailyReminderNotices,
    monthlyRecapNotice,
    RECAP_REMINDER_PREFIX,
    secondEntryNudge,
    reminderReconcile,
    reminderTime,
} from "@/domain/reminder";

import { posthog } from "./posthog";
import { Reminders } from "./reminders";
import type { DatedReminder } from "./reminders";

export const readReminderTime = Effect.fn("ReminderSync.readReminderTime")(function* readReminderTime(db: Database) {
    const [option, hour, minute] = yield* Effect.all(
        [Meta.get(db, "notificationOption"), Meta.get(db, "notificationHour"), Meta.get(db, "notificationMinute")],
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
        [Meta.get(db, "showNotifications"), reminders.permission(), Meta.get(db, "hideAmounts")],
        { concurrency: "unbounded" }
    );
    if (enabled && permission === "unknown") {
        return;
    }
    const decision = reminderReconcile(enabled, permission);
    const now = yield* DateTime.nowAsDate;
    const time = decision === "schedule" ? yield* readReminderTime(db) : null;
    const notices: DatedReminder[] = [];
    if (time !== null) {
        const savedAt = yield* Meta.get(db, "secondEntryNudgeDay");
        const secondEntryAfter =
            savedAt > 0 ? secondEntryNudge({ entries: yield* visibleEntryCount(db, now), now, savedAt }) : null;
        if (savedAt > 0 && secondEntryAfter === null) {
            yield* Meta.set(db, "secondEntryNudgeDay", 0);
        }
        notices.push(
            ...dailyReminderNotices({
                hideAmounts,
                last: yield* lastLoggedEntry(db, now),
                now,
                secondEntryAfter,
                time,
            })
        );
        for (const month of [previousMonth(now), firstOfMonth(now)]) {
            const notice = monthlyRecapNotice(month, time);
            if (notice.fireAt > now && (yield* hasEntriesBetween(db, month, addMonths(month, 1), now))) {
                notices.push(notice);
            }
        }
    }

    const keep = new Set(notices.map((notice) => notice.id));
    const pending = yield* reminders.pendingIds();
    if (notices.some(({ data, id }) => data.kind === "second_entry" && !pending.includes(id))) {
        posthog?.capture("second_entry_nudge_armed");
    }
    yield* reminders.cancel(
        pending.filter(
            (id) => (id.startsWith(DAILY_REMINDER_PREFIX) || id.startsWith(RECAP_REMINDER_PREFIX)) && !keep.has(id)
        )
    );
    yield* armReminders(notices);

    if (decision === "disable") {
        yield* Meta.set(db, "showNotifications", false);
    }
});

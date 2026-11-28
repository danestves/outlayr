import { REMINDER_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import { addDays, addMonths, firstOfMonth, startOfWeek } from "@outlayr/money/calendar";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { Meta } from "@/data/app-meta-core";
import { hasEntriesBetween, lastLoggedEntry, liveEntryCount } from "@/data/transactions-core";
import { loadWeekRecap } from "@/data/week-recap-core";
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
    WEEKLY_RECAP_REMINDER_PREFIX,
    weeklyRecapNotice,
} from "@/domain/reminder";
import type { TimeOfDay } from "@/domain/reminder";

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

// Next week is queued too, so someone who stops opening the app still gets the quiet-week recap.
const weeklyRecapNotices = Effect.fn("ReminderSync.weeklyRecapNotices")(
    function* weeklyRecapNotices(db: Database, input: { hideAmounts: boolean; now: Date; time: TimeOfDay }) {
        const { hideAmounts, now, time } = input;
        const [firstWeekday, currency] = yield* Effect.all([Meta.get(db, "firstWeekday"), Meta.get(db, "currency")], {
            concurrency: "unbounded",
        });
        const currentWeek = startOfWeek(now, firstWeekday);
        const notices: DatedReminder[] = [];
        for (const week of [addDays(currentWeek, -7), currentWeek, addDays(currentWeek, 7)]) {
            // Read through the week's end: the copy is fixed now but read after the week closes.
            const until = addDays(week, 7);
            const recap = yield* loadWeekRecap(db, { currency, firstWeekday, now: until, week });
            const notice = weeklyRecapNotice({ currency, hideAmounts, recap, time, week });
            if (notice !== null && notice.fireAt.getTime() > now.getTime()) {
                notices.push(notice);
            }
        }
        return notices;
    },
    (effect) =>
        effect.pipe(
            Effect.catch((error) =>
                Effect.logWarning("[outlayr] weekly recap read failed", error).pipe(Effect.as<DatedReminder[]>([]))
            )
        )
);

export const reconcileDailyReminder = Effect.fn("ReminderSync.reconcileDailyReminder")(function* reconcileDailyReminder(
    db: Database
) {
    const reminders = yield* Reminders;
    const [enabled, permission, hideAmounts, weeklyRecap] = yield* Effect.all(
        [
            Meta.get(db, "showNotifications"),
            reminders.permission(),
            Meta.get(db, "hideAmounts"),
            Meta.get(db, "weeklyRecap"),
        ],
        { concurrency: "unbounded" }
    );
    // A queued recap may predate Hide amounts: drop it before a read below can fail. A good pass re-arms it.
    if (hideAmounts || (permission === "unknown" && !weeklyRecap)) {
        const pending = yield* reminders.pendingIds();
        yield* reminders.cancel(pending.filter((id) => id.startsWith(WEEKLY_RECAP_REMINDER_PREFIX)));
    }
    if (enabled && permission === "unknown") {
        return;
    }
    if (permission === "denied" && weeklyRecap) {
        yield* Meta.set(db, "weeklyRecap", false);
    }
    const decision = reminderReconcile(enabled, permission);
    const now = yield* DateTime.nowAsDate;
    const weeklyActive = weeklyRecap && permission === "granted";
    const time = decision === "schedule" || weeklyActive ? yield* readReminderTime(db) : null;
    const notices: DatedReminder[] = [];
    const [savedAt, armedAt] = yield* Effect.all(
        [Meta.get(db, "secondEntryNudgeSavedAt"), Meta.get(db, "secondEntryNudgeArmedAt")],
        { concurrency: "unbounded" }
    );
    const secondEntryAfter =
        savedAt > 0 ? secondEntryNudge({ armedAt, entries: yield* liveEntryCount(db), now, savedAt }) : null;
    if (savedAt > 0 && secondEntryAfter === null) {
        yield* Meta.set(db, "secondEntryNudgeSavedAt", 0);
    }
    if (time !== null && decision === "schedule") {
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
    if (time !== null && weeklyActive) {
        notices.push(...(yield* weeklyRecapNotices(db, { hideAmounts, now, time })));
    }

    const keep = new Set(notices.map((notice) => notice.id));
    const pending = yield* reminders.pendingIds();
    yield* reminders.cancel(
        pending.filter((id) => {
            if (keep.has(id)) {
                return false;
            }
            if (id.startsWith(DAILY_REMINDER_PREFIX) || id.startsWith(RECAP_REMINDER_PREFIX)) {
                return true;
            }
            // A failed permission read keeps a queued recap unless it was opted out.
            const keepUnverified = permission === "unknown" && weeklyRecap;
            return !keepUnverified && id.startsWith(WEEKLY_RECAP_REMINDER_PREFIX);
        })
    );
    yield* armReminders(notices);

    const nudge = notices.find(({ data }) => data.kind === "second_entry");
    if (nudge !== undefined && nudge.fireAt.getTime() !== armedAt) {
        yield* Meta.set(db, "secondEntryNudgeArmedAt", nudge.fireAt.getTime());
        if (armedAt === 0 && now.getTime() >= REMINDER_ANALYTICS_AT_MS) {
            posthog?.capture("second_entry_nudge_armed");
        }
    }

    if (decision === "disable") {
        yield* Meta.set(db, "showNotifications", false);
    }
});

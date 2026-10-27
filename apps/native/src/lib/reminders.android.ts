import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
    AndroidImportance,
    cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    SchedulableTriggerInputTypes,
    scheduleNotificationAsync,
    setNotificationChannelAsync,
} from "expo-notifications";
import { Linking } from "react-native";

import type { ReminderPermission } from "@/domain/reminder";
import { translateNow } from "@/i18n/runtime";
import { duringHandoff, expectHandoff } from "@/lib/app-handoff";
import type {
    openNotificationSettings as iosOpenNotificationSettings,
    Reminders as IosReminders,
} from "@/lib/reminders";

import { attemptReminders, toPermission } from "./reminders-core";
import type { DatedReminder } from "./reminders-core";

export type { DatedReminder } from "./reminders-core";

const REMINDER_CHANNEL = "reminders";

/**
 * From Android 13 the permission prompt only appears once a channel exists. Set on every use so its name follows
 * the app's language; Android keeps whatever the user changed on an existing channel.
 */
const ensureReminderChannel = Effect.fn("Reminders.ensureChannel")(function* ensureReminderChannel(
    operation: "request" | "schedule"
) {
    yield* attemptReminders(operation, () =>
        setNotificationChannelAsync(REMINDER_CHANNEL, {
            importance: AndroidImportance.DEFAULT,
            name: translateNow("settings.notifications.channel"),
        })
    );
});

const permission = Effect.fn("Reminders.permission")(function* permission() {
    return yield* attemptReminders("permission", getPermissionsAsync).pipe(
        Effect.map(toPermission),
        Effect.catchTags({
            RemindersError: (error) =>
                Effect.logWarning("[outlayr] notification permission read failed", error.cause).pipe(
                    Effect.as<ReminderPermission>("unknown")
                ),
        })
    );
});

const request = Effect.fn("Reminders.request")(function* request() {
    return yield* ensureReminderChannel("request").pipe(
        // The system prompt is an activity of its own.
        Effect.andThen(duringHandoff(attemptReminders("request", requestPermissionsAsync))),
        Effect.map(toPermission),
        Effect.catchTags({
            RemindersError: (error) =>
                Effect.logWarning("[outlayr] notification permission request failed", error.cause).pipe(
                    Effect.as<ReminderPermission>("unknown")
                ),
        })
    );
});

const pendingIds = Effect.fn("Reminders.pendingIds")(function* pendingIds() {
    return yield* attemptReminders("pending", getAllScheduledNotificationsAsync).pipe(
        Effect.map((requests) => requests.map((pending) => pending.identifier)),
        Effect.catchTags({ RemindersError: () => Effect.succeed<string[]>([]) })
    );
});

const schedule = Effect.fn("Reminders.schedule")(function* schedule({ id, title, body, data, fireAt }: DatedReminder) {
    yield* ensureReminderChannel("schedule");
    yield* attemptReminders("schedule", () =>
        scheduleNotificationAsync({
            content: { body, data, sound: "default", title },
            identifier: id,
            trigger: { channelId: REMINDER_CHANNEL, date: fireAt, type: SchedulableTriggerInputTypes.DATE },
        })
    );
});

// Kept sequential like iOS; the sweeps cancel a handful at most.
const cancel = Effect.fn("Reminders.cancel")(function* cancel(ids: readonly string[]) {
    for (const id of ids) {
        yield* attemptReminders("cancel", () => cancelScheduledNotificationAsync(id));
    }
});

export const Reminders: typeof IosReminders = Context.Reference<(typeof IosReminders)["Service"]>(
    "outlayr/lib/Reminders",
    { defaultValue: () => ({ cancel, pendingIds, permission, request, schedule }) }
);

export const openNotificationSettings: typeof iosOpenNotificationSettings = () => {
    expectHandoff();
    Effect.runFork(
        Effect.tryPromise(() => Linking.openSettings()).pipe(
            Effect.catchTags({
                UnknownError: (error) =>
                    Effect.sync(() => console.warn("[outlayr] opening notification settings failed", error.cause)),
            })
        )
    );
};

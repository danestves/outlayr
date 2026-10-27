import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
    cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    SchedulableTriggerInputTypes,
    scheduleNotificationAsync,
} from "expo-notifications";
import { Linking } from "react-native";

import type { ReminderPermission } from "@/domain/reminder";
import { expectHandoff } from "@/lib/app-handoff";

import { attemptReminders, toPermission } from "./reminders-core";
import type { DatedReminder, RemindersError } from "./reminders-core";

export type { DatedReminder } from "./reminders-core";

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
    return yield* attemptReminders("request", () =>
        requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
        })
    ).pipe(
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

/** One-shot DATE trigger, not a repeat: a chain's next charge is recomputed, so each sweep re-arms it by identifier. */
const schedule = Effect.fn("Reminders.schedule")(function* schedule({ id, title, body, data, fireAt }: DatedReminder) {
    yield* attemptReminders("schedule", () =>
        scheduleNotificationAsync({
            content: { body, data, sound: "default", title },
            identifier: id,
            trigger: { date: fireAt, type: SchedulableTriggerInputTypes.DATE },
        })
    );
});

// cancelScheduledNotificationAsync mutates one shared iOS notification queue, so overlapping cancels race each other.
const cancel = Effect.fn("Reminders.cancel")(function* cancel(ids: readonly string[]) {
    for (const id of ids) {
        yield* attemptReminders("cancel", () => cancelScheduledNotificationAsync(id));
    }
});

export const Reminders = Context.Reference<{
    readonly cancel: (ids: readonly string[]) => Effect.Effect<void, RemindersError>;
    readonly pendingIds: () => Effect.Effect<string[]>;
    readonly permission: () => Effect.Effect<ReminderPermission>;
    readonly request: () => Effect.Effect<ReminderPermission>;
    readonly schedule: (reminder: DatedReminder) => Effect.Effect<void, RemindersError>;
}>("outlayr/lib/Reminders", {
    defaultValue: () => ({ cancel, pendingIds, permission, request, schedule }),
});

export function openNotificationSettings(): void {
    expectHandoff();
    Effect.runFork(
        Effect.tryPromise(() => Linking.openSettings()).pipe(
            Effect.catchTags({
                UnknownError: (error) =>
                    Effect.sync(() => console.warn("[outlayr] opening notification settings failed", error.cause)),
            })
        )
    );
}

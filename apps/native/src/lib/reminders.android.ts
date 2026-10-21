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
import type { NotificationPermissionsStatus } from "expo-notifications";
import { Linking } from "react-native";

import type { ReminderPermission } from "@/domain/reminder";
import { translateNow } from "@/i18n/runtime";
import { duringHandoff, expectHandoff } from "@/lib/app-handoff";
import type {
    cancelReminders as iosCancelReminders,
    openNotificationSettings as iosOpenNotificationSettings,
    pendingReminderIds as iosPendingReminderIds,
    reminderPermission as iosReminderPermission,
    requestReminderPermission as iosRequestReminderPermission,
    scheduleDatedReminder as iosScheduleDatedReminder,
} from "@/lib/reminders";

export type { DatedReminder } from "@/lib/reminders";

const REMINDER_CHANNEL = "reminders";

/**
 * From Android 13 the permission prompt only appears once a channel exists. Set on every use so its name follows
 * the app's language; Android keeps whatever the user changed on an existing channel.
 */
async function ensureReminderChannel(): Promise<void> {
    await setNotificationChannelAsync(REMINDER_CHANNEL, {
        importance: AndroidImportance.DEFAULT,
        name: translateNow("settings.notifications.channel"),
    });
}

/** On Android `canAskAgain` survives the first refusal: the system prompt shows twice. */
function toPermission(result: NotificationPermissionsStatus): ReminderPermission {
    if (result.granted) {
        return "granted";
    }
    return result.canAskAgain ? "undetermined" : "denied";
}

export const reminderPermission: typeof iosReminderPermission = async () => {
    try {
        return toPermission(await getPermissionsAsync());
    } catch (error) {
        console.warn("[outlayr] notification permission read failed", error);
        return "unknown";
    }
};

export const requestReminderPermission: typeof iosRequestReminderPermission = async () => {
    try {
        await ensureReminderChannel();
        // The system prompt is an activity of its own.
        return toPermission(await duringHandoff(requestPermissionsAsync));
    } catch (error) {
        console.warn("[outlayr] notification permission request failed", error);
        return "unknown";
    }
};

export const pendingReminderIds: typeof iosPendingReminderIds = async () => {
    try {
        const requests = await getAllScheduledNotificationsAsync();
        return requests.map((request) => request.identifier);
    } catch {
        return [];
    }
};

export const scheduleDatedReminder: typeof iosScheduleDatedReminder = async ({ id, title, body, data, fireAt }) => {
    await ensureReminderChannel();
    await scheduleNotificationAsync({
        content: { body, data, sound: "default", title },
        identifier: id,
        trigger: { channelId: REMINDER_CHANNEL, date: fireAt, type: SchedulableTriggerInputTypes.DATE },
    });
};

export const cancelReminders: typeof iosCancelReminders = async (ids) => {
    for (const id of ids) {
        // oxlint-disable-next-line no-await-in-loop -- kept sequential like iOS; the sweeps cancel a handful at most.
        await cancelScheduledNotificationAsync(id);
    }
};

export const openNotificationSettings: typeof iosOpenNotificationSettings = () => {
    expectHandoff();
    Linking.openSettings().catch((error) => {
        console.warn("[outlayr] opening notification settings failed", error);
    });
};

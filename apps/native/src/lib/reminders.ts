import {
    cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    SchedulableTriggerInputTypes,
    scheduleNotificationAsync,
} from "expo-notifications";
import type { NotificationPermissionsStatus } from "expo-notifications";
import { Linking } from "react-native";

import type { ReminderPermission } from "@/domain/reminder";
import { expectHandoff } from "@/lib/app-handoff";

/** On iOS `canAskAgain` is true only while the prompt has never been shown. */
function toPermission(result: NotificationPermissionsStatus): ReminderPermission {
    if (result.granted) {
        return "granted";
    }
    return result.canAskAgain ? "undetermined" : "denied";
}

export async function reminderPermission(): Promise<ReminderPermission> {
    try {
        return toPermission(await getPermissionsAsync());
    } catch (error) {
        console.warn("[outlayr] notification permission read failed", error);
        return "unknown";
    }
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
    try {
        return toPermission(
            await requestPermissionsAsync({
                ios: { allowAlert: true, allowBadge: true, allowSound: true },
            })
        );
    } catch (error) {
        console.warn("[outlayr] notification permission request failed", error);
        return "unknown";
    }
}

export async function pendingReminderIds(): Promise<string[]> {
    try {
        const requests = await getAllScheduledNotificationsAsync();
        return requests.map((request) => request.identifier);
    } catch {
        return [];
    }
}

export interface DatedReminder {
    body: string;
    data: Record<string, string>;
    fireAt: Date;
    id: string;
    title: string;
}

/** One-shot DATE trigger, not a repeat: a chain's next charge is recomputed, so each sweep re-arms it by identifier. */
export async function scheduleDatedReminder({ id, title, body, data, fireAt }: DatedReminder): Promise<void> {
    await scheduleNotificationAsync({
        content: { body, data, sound: "default", title },
        identifier: id,
        trigger: { date: fireAt, type: SchedulableTriggerInputTypes.DATE },
    });
}

export async function cancelReminders(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
        // oxlint-disable-next-line no-await-in-loop -- cancelScheduledNotificationAsync mutates one shared iOS notification queue, so overlapping cancels race each other.
        await cancelScheduledNotificationAsync(id);
    }
}

export function openNotificationSettings(): void {
    expectHandoff();
    Linking.openSettings().catch((error) => {
        console.warn("[outlayr] opening notification settings failed", error);
    });
}

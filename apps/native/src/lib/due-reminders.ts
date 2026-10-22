import { Alert } from "react-native";

import { getMetaSync } from "@/data/app-meta-core";
import { setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { enableReminderStep } from "@/domain/reminder";
import type { TranslatableKey } from "@/i18n/catalog";
import { translateNow } from "@/i18n/runtime";

import { openNotificationSettings, reminderPermission, requestReminderPermission } from "./reminders";

/**
 * Counted from the form's `onDone`, so the question lands on the screen behind the sheet, not over it. shortcut: no
 * event reaches JS when a native sheet finishes dismissing, so this is timed; listen for one if that changes.
 */
const AFTER_SHEET_MS = 600;

/** Resolves false when turning on ended without a grant, so nothing was written. */
export async function setDueReminders(
    db: Database,
    key: "installmentReminders" | "subscriptionReminders",
    next: boolean
): Promise<boolean> {
    if (next) {
        const existing = await reminderPermission();
        if (enableReminderStep(existing) === "open-settings") {
            Alert.alert(
                translateNow("settings.notifications.deniedTitle"),
                translateNow("settings.notifications.deniedBody"),
                [
                    {
                        style: "cancel",
                        text: translateNow("settings.notifications.notNow"),
                    },
                    {
                        onPress: openNotificationSettings,
                        text: translateNow("settings.notifications.openSettings"),
                    },
                ]
            );
            return false;
        }
        const granted = existing === "granted" ? existing : await requestReminderPermission();
        if (granted !== "granted") {
            return false;
        }
    }
    await setBoolSetting(db, key, next);
    return true;
}

/**
 * Asks only while cuota notices were never set either way; an unanswered ask writes nothing, so the next order asks
 * again. Returns whether it asks, so other prompts can stand aside.
 */
export function askForInstallmentReminders(
    db: Database,
    question: TranslatableKey = "installments.reminder.ask"
): boolean {
    if (getMetaSync(db, "installmentReminders") !== null) {
        return false;
    }
    setTimeout(() => ask(db, question), AFTER_SHEET_MS);
    return true;
}

async function turnOn(db: Database): Promise<void> {
    if (!(await setDueReminders(db, "installmentReminders", true))) {
        await setBoolSetting(db, "installmentReminders", false);
    }
}

function ask(db: Database, question: TranslatableKey): void {
    Alert.alert(translateNow(question), undefined, [
        {
            onPress: () => {
                setBoolSetting(db, "installmentReminders", false).catch((error) => {
                    console.error("Declining installment reminders failed", error);
                });
            },
            style: "cancel",
            text: translateNow("settings.notifications.notNow"),
        },
        {
            onPress: () => {
                turnOn(db).catch((error) => {
                    console.error("Turning on installment reminders failed", error);
                });
            },
            text: translateNow("installments.reminder.turnOn"),
        },
    ]);
}

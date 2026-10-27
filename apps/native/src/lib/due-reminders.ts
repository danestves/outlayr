import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { Alert } from "react-native";

import { setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { enableReminderStep } from "@/domain/reminder";
import type { TranslatableKey } from "@/i18n/catalog";
import { translateNow } from "@/i18n/runtime";

import { openNotificationSettings, Reminders } from "./reminders";

/**
 * Counted from the form's `onDone`, so the question lands on the screen behind the sheet, not over it. shortcut: no
 * event reaches JS when a native sheet finishes dismissing, so this is timed; listen for one if that changes.
 */
const AFTER_SHEET = Duration.millis(600);

/** Resolves false when turning on ended without a grant, so nothing was written. */
export const setDueReminders = Effect.fn("DueReminders.set")(function* setDueReminders(
    db: Database,
    key: "installmentReminders" | "subscriptionReminders",
    next: boolean
) {
    if (next) {
        const reminders = yield* Reminders;
        const existing = yield* reminders.permission();
        if (enableReminderStep(existing) === "open-settings") {
            yield* Effect.sync(() => {
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
            });
            return false;
        }
        const granted = existing === "granted" ? existing : yield* reminders.request();
        if (granted !== "granted") {
            return false;
        }
    }
    yield* setBoolSetting(db, key, next);
    return true;
});

export const turnOnInstallmentReminders = Effect.fn("DueReminders.turnOnInstallments")(
    function* turnOnInstallmentReminders(db: Database) {
        if (!(yield* setDueReminders(db, "installmentReminders", true))) {
            yield* setBoolSetting(db, "installmentReminders", false);
        }
    }
);

export const declineInstallmentReminders = Effect.fn("DueReminders.declineInstallments")(
    function* declineInstallmentReminders(db: Database) {
        yield* setBoolSetting(db, "installmentReminders", false);
    }
);

export const showInstallmentQuestion = Effect.fn("DueReminders.showInstallmentQuestion")(
    function* showInstallmentQuestion(input: {
        onDecline: () => void;
        onTurnOn: () => void;
        question: TranslatableKey;
    }) {
        yield* Effect.sleep(AFTER_SHEET);
        yield* Effect.sync(() => {
            Alert.alert(translateNow(input.question), undefined, [
                { onPress: input.onDecline, style: "cancel", text: translateNow("settings.notifications.notNow") },
                { onPress: input.onTurnOn, text: translateNow("installments.reminder.turnOn") },
            ]);
        });
    }
);

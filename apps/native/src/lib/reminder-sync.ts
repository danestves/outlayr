import type { Database } from "@/db/client";
import {
    clampTimeOfDay,
    DAILY_REMINDER_PREFIX,
    dailyReminderNotices,
    reminderReconcile,
    reminderTime,
} from "@/domain/reminder";
import type { TimeOfDay } from "@/domain/reminder";
import { lastLoggedEntryCommand, runLedgerCommand } from "@/state/ledger-commands";
import {
    readBoolSettingCommand,
    readNumberSettingCommand,
    runSettingsCommand,
    setBoolSettingCommand,
} from "@/state/settings-commands";

import { cancelReminders, pendingReminderIds, reminderPermission, scheduleDatedReminder } from "./reminders";

export async function readReminderTime(db: Database): Promise<TimeOfDay> {
    const [option, hour, minute] = await Promise.all([
        runSettingsCommand(readNumberSettingCommand, { db, key: "notificationOption" }),
        runSettingsCommand(readNumberSettingCommand, { db, key: "notificationHour" }),
        runSettingsCommand(readNumberSettingCommand, { db, key: "notificationMinute" }),
    ]);
    return reminderTime(option, clampTimeOfDay(hour, minute));
}

export async function reconcileDailyReminder(db: Database): Promise<void> {
    const [enabled, permission, hideAmounts] = await Promise.all([
        runSettingsCommand(readBoolSettingCommand, { db, key: "showNotifications" }),
        reminderPermission(),
        runSettingsCommand(readBoolSettingCommand, { db, key: "hideAmounts" }),
    ]);
    if (enabled && permission === "unknown") {
        return;
    }
    const decision = reminderReconcile(enabled, permission);
    const now = new Date();
    const notices =
        decision === "schedule"
            ? dailyReminderNotices({
                  hideAmounts,
                  last: await runLedgerCommand(lastLoggedEntryCommand, { db, now }),
                  now,
                  time: await readReminderTime(db),
              })
            : [];

    const keep = new Set(notices.map((notice) => notice.id));
    const pending = await pendingReminderIds();
    await cancelReminders(pending.filter((id) => id.startsWith(DAILY_REMINDER_PREFIX) && !keep.has(id)));
    for (const notice of notices) {
        // oxlint-disable-next-line no-await-in-loop -- arming mutates the one shared iOS notification queue, which is why `cancelReminders` (lib/reminders.ts) walks it serially too
        await scheduleDatedReminder(notice);
    }

    if (decision === "disable") {
        await runSettingsCommand(setBoolSettingCommand, { db, key: "showNotifications", value: false });
    }
}

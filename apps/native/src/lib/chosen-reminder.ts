import { META_KEYS } from "@/data/app-meta-core";
import { isReminderChosen } from "@/data/onboarding-core";
import type { Database } from "@/db/client";
import { getMetaCommand, runSettingsCommand, setBoolSettingCommand, setMetaCommand } from "@/state/settings-commands";

import { reminderPermission, requestReminderPermission } from "./reminders";

async function arm(db: Database): Promise<void> {
    const [chosen, asked, stored] = await Promise.all([
        runSettingsCommand(getMetaCommand, { db, key: META_KEYS.reminderChosen }),
        runSettingsCommand(getMetaCommand, { db, key: META_KEYS.reminderAsked }),
        runSettingsCommand(getMetaCommand, { db, key: "showNotifications" }),
    ]);
    if (!isReminderChosen(chosen) || asked === "true") {
        return;
    }
    if (stored !== null) {
        // A switch set since the offer is the user's own answer and outranks the onboarding one.
        await runSettingsCommand(setMetaCommand, { db, key: META_KEYS.reminderAsked, value: "true" });
        return;
    }
    const existing = await reminderPermission();
    if (existing === "unknown") {
        // The read failed; the next save tries again rather than spending the ask.
        return;
    }
    await runSettingsCommand(setMetaCommand, { db, key: META_KEYS.reminderAsked, value: "true" });
    if (existing === "denied") {
        return;
    }
    const granted = existing === "granted" ? existing : await requestReminderPermission();
    if (granted === "granted") {
        await runSettingsCommand(setBoolSettingCommand, { db, key: "showNotifications", value: true });
    }
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * The OS prompt waits for the first saved entry, since iOS asks only once. Serial, so a save landing while the
 * prompt is up waits for its answer instead of asking twice.
 */
export function armChosenReminder(db: Database): Promise<void> {
    const run = queue.then(() => arm(db));
    queue = run.catch(() => null);
    return run;
}

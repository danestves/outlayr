import * as Effect from "effect/Effect";

import { getMetaSync } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
import type { TranslatableKey } from "@/i18n/catalog";
import {
    declineInstallmentReminders,
    setDueReminders,
    showInstallmentQuestion,
    turnOnInstallmentReminders,
} from "@/lib/due-reminders";
import { syncInstallmentReminders } from "@/lib/installment-reminder-sync";
import { resolveReminderTap, resolveWalletPushTap } from "@/lib/notification-taps";
import type { ReminderTap, WalletPushTap } from "@/lib/notification-taps";
import { claimOverBudgetMoment } from "@/lib/over-budget-moment";
import { Reminders } from "@/lib/reminders";
import { askForReview } from "@/lib/review-prompt";
import { appRuntime } from "@/lib/runtime";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";

import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const surfacesCommand = <A, E, W = void>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `surfaces:${label}` });

export async function runSurfacesCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

export const reminderPermissionCommand = surfacesCommand("reminder-permission", () =>
    Reminders.pipe(Effect.flatMap((reminders) => reminders.permission()))
);

export const requestReminderPermissionCommand = surfacesCommand("request-reminder-permission", () =>
    Reminders.pipe(Effect.flatMap((reminders) => reminders.request()))
);

export const setDueRemindersCommand = surfacesCommand(
    "set-due-reminders",
    (input: { db: Database; key: "installmentReminders" | "subscriptionReminders"; next: boolean }) =>
        setDueReminders(input.db, input.key, input.next)
);

export const syncSubscriptionRemindersCommand = surfacesCommand("sync-subscription-reminders", (db: Database) =>
    syncSubscriptionReminders(db)
);

export const syncInstallmentRemindersCommand = surfacesCommand("sync-installment-reminders", (db: Database) =>
    syncInstallmentReminders(db)
);

const turnOnInstallmentRemindersCommand = surfacesCommand("turn-on-installment-reminders", (db: Database) =>
    turnOnInstallmentReminders(db)
);

const declineInstallmentRemindersCommand = surfacesCommand("decline-installment-reminders", (db: Database) =>
    declineInstallmentReminders(db)
);

const showInstallmentQuestionCommand = surfacesCommand(
    "show-installment-question",
    (input: Parameters<typeof showInstallmentQuestion>[0]) => showInstallmentQuestion(input)
);

export const askForReviewCommand = surfacesCommand("ask-for-review", (db: Database) => askForReview(db));

export const claimOverBudgetMomentCommand = surfacesCommand("claim-over-budget-moment", (key: string) =>
    claimOverBudgetMoment(key)
);

export const resolveReminderTapCommand = surfacesCommand(
    "resolve-reminder-tap",
    (input: { db: Database; tap: ReminderTap }) => resolveReminderTap(input.db, input.tap)
);

export const resolveWalletPushTapCommand = surfacesCommand(
    "resolve-wallet-push-tap",
    (input: { db: Database; tap: WalletPushTap }) => resolveWalletPushTap(input.db, input.tap)
);

/** Re-arms now rather than on the next foreground, which may come after the notice fired. The write already landed. */
export function rearmInstallmentReminders(db: Database): void {
    runSurfacesCommand(syncInstallmentRemindersCommand, db).catch((error) => {
        console.error("Installment reminder sync failed", error);
    });
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
    runSurfacesCommand(showInstallmentQuestionCommand, {
        onDecline: () => {
            runSurfacesCommand(declineInstallmentRemindersCommand, db).catch((error) => {
                console.error("Declining installment reminders failed", error);
            });
        },
        onTurnOn: () => {
            runSurfacesCommand(turnOnInstallmentRemindersCommand, db).catch((error) => {
                console.error("Turning on installment reminders failed", error);
            });
        },
        question,
    }).catch((error) => {
        console.error("Asking for installment reminders failed", error);
    });
    return true;
}

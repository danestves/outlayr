import { readPlans } from "@/data/installments-core";
import { owedPayoffPlans } from "@/data/payoff-plans";
import { readBoolSetting, setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { accounts } from "@/db/schema";
import {
    cuotaNotice,
    cuotaReminders,
    debtNotice,
    debtReminders,
    installmentReminderCap,
    orphanedInstallmentReminderIds,
} from "@/domain/installment-reminder";
import { orderName } from "@/domain/installments";
import type { TimeOfDay } from "@/domain/reminder";
import { reminderReconcile } from "@/domain/reminder";
import { translateNow } from "@/i18n/runtime";

import { readReminderTime } from "./reminder-sync";
import { cancelReminders, pendingReminderIds, reminderPermission, scheduleDatedReminder } from "./reminders";
import type { DatedReminder } from "./reminders";

export function syncInstallmentReminders(db: Database): Promise<void> {
    const run = queue.then(() => reconcileInstallmentReminders(db));
    queue = run.catch(() => {
        // Swallowed so one failed sync does not poison the queue.
    });
    return run;
}

/** Re-arms now rather than on the next foreground, which may come after the notice fired. The write already landed. */
export function rearmInstallmentReminders(db: Database): void {
    syncInstallmentReminders(db).catch((error) => {
        console.error("Installment reminder sync failed", error);
    });
}

/** One pass at a time, for the reason `subscription-reminder-sync.ts` gives. */
let queue: Promise<unknown> = Promise.resolve();

async function reconcileInstallmentReminders(db: Database): Promise<void> {
    const [enabled, permission, hideAmounts] = await Promise.all([
        readBoolSetting(db, "installmentReminders"),
        reminderPermission(),
        readBoolSetting(db, "hideAmounts"),
    ]);
    if (enabled && permission === "unknown") {
        return;
    }
    const decision = reminderReconcile(enabled, permission);
    const pending = await pendingReminderIds();
    const notices =
        decision === "schedule"
            ? await dueNotices(db, new Date(), await readReminderTime(db), installmentReminderCap(pending), hideAmounts)
            : [];

    await cancelReminders(
        orphanedInstallmentReminderIds(
            notices.map((notice) => notice.id),
            pending
        )
    );
    for (const notice of notices) {
        // oxlint-disable-next-line no-await-in-loop -- arming mutates the one shared iOS notification queue, which is why `cancelReminders` (lib/reminders.ts) walks it serially too
        await scheduleDatedReminder(notice);
    }

    if (decision === "disable") {
        await setBoolSetting(db, "installmentReminders", false);
    }
}

async function dueNotices(
    db: Database,
    now: Date,
    time: TimeOfDay,
    cap: number,
    hideAmounts: boolean
): Promise<DatedReminder[]> {
    const debts = debtReminders(await owedPayoffPlans(db, now), now, time).map((plan) =>
        debtNotice(
            {
                accountId: plan.account.id,
                amount: plan.owed,
                currency: plan.account.currency,
                fireAt: plan.fireAt,
                id: plan.id,
                person: plan.account.name,
            },
            hideAmounts
        )
    );
    return [...cuotaNotices(db, now, time, cap, hideAmounts), ...debts]
        .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
        .slice(0, cap);
}

function cuotaNotices(db: Database, now: Date, time: TimeOfDay, cap: number, hideAmounts: boolean): DatedReminder[] {
    const names = new Map(
        db
            .select({ id: accounts.id, name: accounts.name })
            .from(accounts)
            .all()
            .map((account) => [account.id, account.name])
    );
    const owed = readPlans(db, now).flatMap(({ plan, purchase, standing }) =>
        standing.rows
            .filter((row) => row.status !== "paid")
            .map((row) => ({
                account: names.get(plan.accountId) ?? "",
                amount: row.remaining,
                currency: plan.currency,
                dueDate: row.row.dueDate,
                installmentId: row.row.id,
                order: orderName(translateNow, purchase),
                planId: plan.id,
            }))
    );
    return cuotaReminders(owed, now, time, cap).map((cuota) => cuotaNotice(cuota, hideAmounts));
}

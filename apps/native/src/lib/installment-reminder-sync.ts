import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

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

import { armReminders, readReminderTime } from "./reminder-sync";
import { Reminders } from "./reminders";
import type { DatedReminder } from "./reminders";

export class InstallmentReminderError extends Schema.TaggedError<InstallmentReminderError>()(
    "InstallmentReminderError",
    { cause: Schema.Defect() }
) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Reading the cuotas to remind failed";
    }
}

const cuotaNotices = Effect.fn("InstallmentReminderSync.cuotaNotices")(function* cuotaNotices(
    db: Database,
    now: Date,
    time: TimeOfDay,
    cap: number,
    hideAmounts: boolean
) {
    return yield* Effect.try({
        catch: (cause) => new InstallmentReminderError({ cause }),
        try: () => {
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
        },
    });
});

const dueNotices = Effect.fn("InstallmentReminderSync.dueNotices")(function* dueNotices(
    db: Database,
    now: Date,
    time: TimeOfDay,
    cap: number,
    hideAmounts: boolean
) {
    const debts = debtReminders(yield* owedPayoffPlans(db, now), now, time).map((plan) =>
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
    const cuotas: DatedReminder[] = yield* cuotaNotices(db, now, time, cap, hideAmounts);
    return [...cuotas, ...debts].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, cap);
});

const reconcileInstallmentReminders = Effect.fn("InstallmentReminderSync.reconcile")(
    function* reconcileInstallmentReminders(db: Database) {
        const reminders = yield* Reminders;
        const [enabled, permission, hideAmounts] = yield* Effect.all(
            [readBoolSetting(db, "installmentReminders"), reminders.permission(), readBoolSetting(db, "hideAmounts")],
            { concurrency: "unbounded" }
        );
        if (enabled && permission === "unknown") {
            return;
        }
        const decision = reminderReconcile(enabled, permission);
        const pending = yield* reminders.pendingIds();
        const notices =
            decision === "schedule"
                ? yield* dueNotices(
                      db,
                      new Date(),
                      yield* readReminderTime(db),
                      installmentReminderCap(pending),
                      hideAmounts
                  )
                : [];

        yield* reminders.cancel(
            orphanedInstallmentReminderIds(
                notices.map((notice) => notice.id),
                pending
            )
        );
        yield* armReminders(notices);

        if (decision === "disable") {
            yield* setBoolSetting(db, "installmentReminders", false);
        }
    }
);

/** One pass at a time, for the reason `subscription-reminder-sync.ts` gives. */
const inFlight = Semaphore.makeUnsafe(1);

export const syncInstallmentReminders = Effect.fn("InstallmentReminderSync.sync")(function* syncInstallmentReminders(
    db: Database
) {
    yield* reconcileInstallmentReminders(db).pipe(inFlight.withPermits(1));
});

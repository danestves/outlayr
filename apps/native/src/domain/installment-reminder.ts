import { CATALOGS, EN } from "@/i18n/catalog";
import type { TranslatableKey } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";
import { translate } from "@/i18n/translate";
import type { TranslationParams } from "@/i18n/translate";
import type { DatedReminder } from "@/lib/reminders";

import { formatAmount } from "./money";
import type { TimeOfDay } from "./reminder";
import { reminderFireAt } from "./subscription-reminder";

export const INSTALLMENT_REMINDERS_DEFAULT = false;

export const INSTALLMENT_REMINDER_PREFIX = "outlayr.cuota-due.";

export const DEBT_REMINDER_PREFIX = "outlayr.debt-due.";

const OWN_PREFIXES = [INSTALLMENT_REMINDER_PREFIX, DEBT_REMINDER_PREFIX] as const;

const isOwn = (id: string) => OWN_PREFIXES.some((prefix) => id.startsWith(prefix));

export function installmentReminderId(installmentId: string): string {
    return `${INSTALLMENT_REMINDER_PREFIX}${installmentId}`;
}

/** iOS keeps at most this many pending requests per app and silently drops the rest. */
const IOS_PENDING_LIMIT = 64;

// The soonest cuotas, re-armed on every foreground. shortcut: a subscription sync outside the ordered pass arms its 55
// without counting pending cuotas, so the total can pass iOS's limit until the next foreground; give each kind a
// fixed share if a ledger ever holds that many subscription notices.
const MAX_PENDING_INSTALLMENT_REMINDERS = 8;

export function installmentReminderCap(pendingIds: readonly string[]): number {
    const others = pendingIds.filter((id) => !isOwn(id)).length;
    return Math.max(0, Math.min(MAX_PENDING_INSTALLMENT_REMINDERS, IOS_PENDING_LIMIT - others));
}

export function cuotaReminders<Cuota extends { dueDate: Date; installmentId: string }>(
    cuotas: readonly Cuota[],
    now: Date,
    time: TimeOfDay,
    cap: number
): (Cuota & { fireAt: Date; id: string })[] {
    return cuotas
        .map((cuota) => ({
            ...cuota,
            fireAt: reminderFireAt(cuota.dueDate, 1, time),
            id: installmentReminderId(cuota.installmentId),
        }))
        .filter((cuota) => cuota.fireAt.getTime() > now.getTime())
        .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
        .slice(0, cap);
}

export interface CuotaNoticeInput {
    account: string;
    amount: number;
    currency: string;
    fireAt: Date;
    id: string;
    order: string;
    planId: string;
}

export function cuotaNotice(
    cuota: CuotaNoticeInput,
    hideAmounts: boolean,
    language: Language = runtimeLanguage()
): DatedReminder {
    const say = (key: TranslatableKey, params: TranslationParams) =>
        translate(key, { catalog: CATALOGS[language], fallback: EN, params });
    return {
        body: hideAmounts
            ? say("installments.reminder.bodyHidden", { account: cuota.account })
            : say("installments.reminder.body", {
                  account: cuota.account,
                  amount: formatAmount(cuota.amount, cuota.currency, true, language),
              }),
        data: { open: "installment", plan: cuota.planId },
        fireAt: cuota.fireAt,
        id: cuota.id,
        title: say("installments.reminder.title", { order: cuota.order }),
    };
}

export function orphanedInstallmentReminderIds(armed: readonly string[], pendingIds: readonly string[]): string[] {
    const keep = new Set(armed);
    return pendingIds.filter((id) => isOwn(id) && !keep.has(id));
}

export function debtReminders<Plan extends { goalId: string; targetDate: Date }>(
    plans: readonly Plan[],
    now: Date,
    time: TimeOfDay
): (Plan & { fireAt: Date; id: string })[] {
    return plans
        .map((plan) => ({
            ...plan,
            fireAt: reminderFireAt(plan.targetDate, 1, time),
            id: `${DEBT_REMINDER_PREFIX}${plan.goalId}`,
        }))
        .filter((plan) => plan.fireAt.getTime() > now.getTime());
}

export interface DebtNoticeInput {
    accountId: string;
    amount: number;
    currency: string;
    fireAt: Date;
    id: string;
    person: string;
}

export function debtNotice(
    debt: DebtNoticeInput,
    hideAmounts: boolean,
    language: Language = runtimeLanguage()
): DatedReminder {
    const say = (key: TranslatableKey, params: TranslationParams) =>
        translate(key, { catalog: CATALOGS[language], fallback: EN, params });
    return {
        body: hideAmounts
            ? say("debts.reminder.bodyHidden", {})
            : say("debts.reminder.body", { amount: formatAmount(debt.amount, debt.currency, true, language) }),
        data: { account: debt.accountId, open: "account" },
        fireAt: debt.fireAt,
        id: debt.id,
        title: say("debts.reminder.title", { person: debt.person }),
    };
}

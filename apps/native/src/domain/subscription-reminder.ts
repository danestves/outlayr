import { addDays } from "@outlayr/money/calendar";

import type { TimeOfDay } from "./reminder";

// Namespaced so reconciliation never cancels `outlayr.daily-reminder`, which another setting owns.
export const SUBSCRIPTION_REMINDER_PREFIX = "outlayr.sub-due.";

export function subscriptionReminderId(localId: string): string {
    return `${SUBSCRIPTION_REMINDER_PREFIX}${localId}`;
}

export function isSubscriptionReminderId(id: string): boolean {
    return id.startsWith(SUBSCRIPTION_REMINDER_PREFIX);
}

export const REMINDER_LEAD_OPTIONS: readonly number[] = [0, 1, 2, 3, 7];

const MAX_LEAD_DAYS = 30;

// `null` is off and must stay distinct from `0`, which means "on the due day itself".
export function normalizeLead(raw: number | null): number | null {
    if (raw == null || !Number.isFinite(raw)) {
        return null;
    }
    return Math.min(MAX_LEAD_DAYS, Math.max(0, Math.floor(raw)));
}

// Whole days back, then the wall-clock hour set outright, so a DST change in between does not shift it an hour.
export function reminderFireAt(landing: Date, leadDays: number, time: TimeOfDay): Date {
    const fire = addDays(landing, -leadDays);
    fire.setHours(time.hour, time.minute, 0, 0);
    return fire;
}

// iOS keeps at most 64 pending requests per app and silently drops the rest; the headroom is the daily reminder's.
export const MAX_PENDING_SUBSCRIPTION_REMINDERS = 55;

export interface ReminderCandidate {
    landing: Date;
    leadDays: number | null;
    localId: string;
}

export interface ArmedReminder {
    fireAt: Date;
    id: string;
    localId: string;
}

export interface ReminderPlanInput {
    candidates: readonly ReminderCandidate[];
    cap?: number;
    now: Date;
    time: TimeOfDay;
}

export interface ReminderPlan {
    arm: ArmedReminder[];
}

// A past fire time is dropped, not nudged: iOS never delivers a past DATE trigger, and moving it would announce a
// charge already taken. Leads go through `normalizeLead` because a negative one would count forward past the charge.
export function reminderPlan({
    candidates,
    now,
    time,
    cap = MAX_PENDING_SUBSCRIPTION_REMINDERS,
}: ReminderPlanInput): ReminderPlan {
    const arm = candidates
        .flatMap((candidate) => {
            const lead = normalizeLead(candidate.leadDays);
            if (lead === null) {
                return [];
            }
            return [
                {
                    fireAt: reminderFireAt(candidate.landing, lead, time),
                    id: subscriptionReminderId(candidate.localId),
                    localId: candidate.localId,
                },
            ];
        })
        .filter((armed) => armed.fireAt.getTime() > now.getTime())
        .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
    return { arm: arm.slice(0, Math.max(0, cap)) };
}

export function orphanedReminderIds(armed: readonly string[], pendingIds: readonly string[]): string[] {
    const keep = new Set(armed);
    return pendingIds.filter((id) => isSubscriptionReminderId(id) && !keep.has(id));
}

export type LeadLabelKey =
    | "settings.notifications.leadOff"
    | "settings.notifications.leadSameDay"
    | "settings.notifications.leadOneDay"
    | "settings.notifications.leadTwoDays"
    | "settings.notifications.leadThreeDays"
    | "settings.notifications.leadOneWeek"
    | "settings.notifications.leadDaysBefore";

export function leadLabelKey(lead: number | null): LeadLabelKey {
    switch (normalizeLead(lead)) {
        case null: {
            return "settings.notifications.leadOff";
        }
        case 0: {
            return "settings.notifications.leadSameDay";
        }
        case 1: {
            return "settings.notifications.leadOneDay";
        }
        case 2: {
            return "settings.notifications.leadTwoDays";
        }
        case 3: {
            return "settings.notifications.leadThreeDays";
        }
        case 7: {
            return "settings.notifications.leadOneWeek";
        }
        default: {
            return "settings.notifications.leadDaysBefore";
        }
    }
}

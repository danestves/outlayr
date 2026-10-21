import { addDays, startOfDay } from "@outlayr/money/calendar";

import { CATALOGS, EN } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";
import { translate } from "@/i18n/translate";
import type { TranslationParams } from "@/i18n/translate";
import type { DatedReminder } from "@/lib/reminders";

import { formatTime } from "./dates";
import { daysBetween } from "./local-day";
import { formatAmount } from "./money";

export const REMINDER_MORNING = 1;
export const REMINDER_EVENING = 2;
export const REMINDER_CUSTOM = 3;

export interface TimeOfDay {
    hour: number;
    minute: number;
}

const MORNING: TimeOfDay = { hour: 8, minute: 0 };
const EVENING: TimeOfDay = { hour: 20, minute: 0 };

export function clampTimeOfDay(hour: number, minute: number): TimeOfDay {
    if (!(Number.isFinite(hour) && Number.isFinite(minute))) {
        return MORNING;
    }
    return {
        hour: Math.min(23, Math.max(0, Math.floor(hour))),
        minute: Math.min(59, Math.max(0, Math.floor(minute))),
    };
}

export function reminderTime(option: number, custom: TimeOfDay): TimeOfDay {
    switch (option) {
        case REMINDER_EVENING: {
            return EVENING;
        }
        case REMINDER_CUSTOM: {
            return custom;
        }
        default: {
            return MORNING;
        }
    }
}

// Hand-rolled, not `toLocaleTimeString`: Hermes ships without ICU and every locale would read back as en-US.
export function formatTimeOfDay(
    { hour, minute }: TimeOfDay,
    use24Hour = false,
    language: Language = runtimeLanguage()
): string {
    const at = new Date();
    at.setHours(hour, minute, 0, 0);
    return formatTime(at, use24Hour, language);
}

export type ReminderPermission = "granted" | "denied" | "undetermined" | "unknown";

export type EnableReminderStep = "schedule" | "request" | "open-settings";

export function enableReminderStep(permission: ReminderPermission): EnableReminderStep {
    switch (permission) {
        case "granted": {
            return "schedule";
        }
        case "denied":
        case "unknown": {
            return "open-settings";
        }
        default: {
            return "request";
        }
    }
}

export type ReminderReconcile = "schedule" | "disable" | "none";

// iOS permission can change behind the app's back, so anything short of `granted` writes the setting back off.
// Granted re-arms: a restore carries the setting across but not the pending request.
export function reminderReconcile(enabled: boolean, permission: ReminderPermission): ReminderReconcile {
    if (!enabled) {
        return "none";
    }
    if (permission === "unknown") {
        return "none";
    }
    return permission === "granted" ? "schedule" : "disable";
}

export const DAILY_REMINDER_PREFIX = "outlayr.daily-reminder";

const DAILY_REMINDER_DAYS = 7;
const MAX_QUIET_DAYS = 6;
const MORNING_ENDS_HOUR = 12;

export interface LastEntry {
    amount: number;
    category: string | null;
    currency: string;
    date: Date;
    income: boolean;
    note: string;
}

export interface DailyReminderInput {
    hideAmounts: boolean;
    language?: Language;
    last: LastEntry | null;
    now: Date;
    time: TimeOfDay;
}

export function dailyReminderNotices({
    hideAmounts,
    language = runtimeLanguage(),
    last,
    now,
    time,
}: DailyReminderInput): DatedReminder[] {
    const say = (key: string, params?: TranslationParams) =>
        translate(key, { catalog: CATALOGS[language], fallback: EN, params });
    const weekday = (day: Date) => say(`dates.weekdayLong.${day.getDay()}`);
    const morning = time.hour < MORNING_ENDS_HOUR;
    const lastDay = last === null ? null : startOfDay(last.date);
    const entry =
        last === null
            ? ""
            : [
                  last.note.trim() || last.category?.trim() || say(last.income ? "common.income" : "common.expense"),
                  hideAmounts
                      ? ""
                      : `${last.income ? "+" : ""}${formatAmount(last.amount, last.currency, true, language)}`,
              ]
                  .filter(Boolean)
                  .join(" ");

    return Array.from({ length: DAILY_REMINDER_DAYS }, (_, offset) => addDays(startOfDay(now), offset)).flatMap(
        (fireDay): DatedReminder[] => {
            const fireAt = new Date(fireDay);
            fireAt.setHours(time.hour, time.minute, 0, 0);
            const subject = morning ? addDays(fireDay, -1) : fireDay;
            const quiet = lastDay === null ? 0 : daysBetween(lastDay.getTime(), fireDay.getTime());
            if (
                fireAt.getTime() <= now.getTime() ||
                (lastDay !== null && (lastDay.getTime() >= subject.getTime() || quiet > MAX_QUIET_DAYS))
            ) {
                return [];
            }
            const id = `${DAILY_REMINDER_PREFIX}.${fireDay.getTime()}`;
            if (lastDay === null) {
                return [
                    {
                        body: say("reminder.daily.first"),
                        data: { open: "create" },
                        fireAt,
                        id,
                        title: say("reminder.daily.empty"),
                    },
                ];
            }
            const data: Record<string, string> = morning
                ? { date: String(addDays(fireAt, -1).getTime()), open: "create" }
                : { open: "create" };
            if (daysBetween(lastDay.getTime(), subject.getTime()) > 1) {
                return [
                    {
                        body: say("reminder.daily.catchUp", { entry }),
                        data,
                        fireAt,
                        id,
                        title: say("reminder.daily.since", { day: weekday(lastDay) }),
                    },
                ];
            }
            return [
                {
                    body:
                        quiet === 1
                            ? say("reminder.daily.lastYesterday", { entry })
                            : say("reminder.daily.lastOn", { day: weekday(lastDay), entry }),
                    data,
                    fireAt,
                    id,
                    title: say(morning ? "reminder.daily.yesterday" : "reminder.daily.today"),
                },
            ];
        }
    );
}

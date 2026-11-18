import { addDays, startOfDay } from "@outlayr/money/calendar";
import type { Locale } from "@outlayr/shared/i18n";

import type { AppKey, AppT } from "./strings";

const TWELVE_HOUR = { de: false, en: true, es: true, fr: false, pt: false } as const satisfies Record<Locale, boolean>;

const WEEKDAYS = [
    "dates.weekday.0",
    "dates.weekday.1",
    "dates.weekday.2",
    "dates.weekday.3",
    "dates.weekday.4",
    "dates.weekday.5",
    "dates.weekday.6",
] as const satisfies readonly AppKey[];

const MONTHS = [
    "dates.month.0",
    "dates.month.1",
    "dates.month.2",
    "dates.month.3",
    "dates.month.4",
    "dates.month.5",
    "dates.month.6",
    "dates.month.7",
    "dates.month.8",
    "dates.month.9",
    "dates.month.10",
    "dates.month.11",
] as const satisfies readonly AppKey[];

const dayOfMonth = (date: Date, locale: Locale) => (locale === "de" ? `${date.getDate()}.` : String(date.getDate()));

export function formatDayTitle(day: Date, now: Date, locale: Locale, t: AppT): string {
    const target = startOfDay(day).getTime();
    if (target === startOfDay(now).getTime()) {
        return t("common.today");
    }
    if (target === startOfDay(addDays(now, -1)).getTime()) {
        return t("common.yesterday");
    }
    const base = `${t(WEEKDAYS[day.getDay()] ?? "dates.weekday.0")}, ${dayOfMonth(day, locale)} ${t(MONTHS[day.getMonth()] ?? "dates.month.0")}`;
    return day.getFullYear() < now.getFullYear() ? `${base} '${String(day.getFullYear()).slice(-2)}` : base;
}

export function formatSentenceDate(date: Date, locale: Locale, t: AppT): string {
    return `${dayOfMonth(date, locale)} ${t(MONTHS[date.getMonth()] ?? "dates.month.0")}`;
}

export function formatTime(date: Date, locale: Locale, t: AppT): string {
    const hours = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, "0");
    if (!TWELVE_HOUR[locale]) {
        return `${String(hours).padStart(2, "0")}:${mm}`;
    }
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${mm} ${t(hours >= 12 ? "dates.meridiem.pm" : "dates.meridiem.am")}`;
}

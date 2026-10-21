import { addDays, startOfDay } from "@outlayr/money/calendar";

import { CATALOGS, EN } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";
import { translate } from "@/i18n/translate";

import { daysBetween } from "./local-day";

/**
 * Hook-free on purpose: widgets, Spotlight and notification bodies format dates outside React. Defaults to the
 * live language rather than English, so a call site that passes none still renders in the user's language.
 */
function dateName(key: string, language: Language, params?: Readonly<Record<string, string | number>>): string {
    return translate(key, {
        catalog: CATALOGS[language] ?? EN,
        fallback: EN,
        params,
    });
}

/** e.g. "7 Jul". Noon keeps the key's calendar day whatever the zone offset. */
export function formatDayMonth(dateKey: string, language: Language = runtimeLanguage()): string {
    const date = new Date(`${dateKey}T12:00:00`);
    return `${date.getDate()} ${monthAbbrevTitle(date, language)}`;
}

export function monthAbbrevTitle(date: Date, language: Language = runtimeLanguage()): string {
    return dateName(`dates.month.${date.getMonth()}`, language);
}

export function monthAbbrev(date: Date, language: Language = runtimeLanguage()): string {
    return monthAbbrevTitle(date, language).toUpperCase();
}

export function weekdayInitial(date: Date, language: Language = runtimeLanguage()): string {
    return dateName(`dates.weekdayInitial.${date.getDay()}`, language);
}

/** TODAY / YESTERDAY / "FRI, 24 JUL", with "'25" appended before the current year. */
export function formatDayHeader(day: Date, now: Date = new Date(), language: Language = runtimeLanguage()): string {
    const today = startOfDay(now).getTime();
    const target = startOfDay(day).getTime();
    if (target === today) {
        return dateName("common.today", language).toUpperCase();
    }
    if (target === startOfDay(addDays(now, -1)).getTime()) {
        return dateName("common.yesterday", language).toUpperCase();
    }
    return formatDateHeader(day, now, language);
}

export function formatDateHeader(day: Date, now: Date = new Date(), language: Language = runtimeLanguage()): string {
    const weekday = dateName(`dates.weekday.${day.getDay()}`, language).toUpperCase();
    const base = `${weekday}, ${day.getDate()} ${monthAbbrev(day, language)}`;
    return day.getFullYear() < now.getFullYear() ? `${base} '${String(day.getFullYear()).slice(-2)}` : base;
}

/** e.g. "Sat, 7 Nov", with the year once it leaves the current one, as a yearly cadence does on its first step. */
export function formatChargeDate(date: Date, now: Date = new Date(), language: Language = runtimeLanguage()): string {
    const weekday = dateName(`dates.weekday.${date.getDay()}`, language);
    const base = `${weekday}, ${date.getDate()} ${monthAbbrevTitle(date, language)}`;
    return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function dueDay(date: Date, from: Date, language: Language = runtimeLanguage()) {
    const days = daysBetween(startOfDay(from).getTime(), startOfDay(date).getTime());
    if (days === 0) {
        return { days, name: dateName("common.today", language) };
    }
    if (days === 1) {
        return { days, name: dateName("common.tomorrow", language) };
    }
    const name =
        days > 1 && days < 7
            ? dateName(`dates.weekdayLong.${date.getDay()}`, language)
            : formatChargeDate(date, from, language);
    return { days, name };
}

export function formatDueDay(date: Date, from: Date, language: Language = runtimeLanguage()): string {
    const { name } = dueDay(date, from, language);
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export function formatWeekdayDay(date: Date, language: Language = runtimeLanguage()): string {
    return `${dateName(`dates.weekday.${date.getDay()}`, language)} ${date.getDate()}`;
}

export function formatUpcomingDate(date: Date, language: Language = runtimeLanguage()): string {
    return `${date.getDate()} ${monthAbbrev(date, language)}`;
}

export function formatSentenceDate(date: Date, language: Language = runtimeLanguage()): string {
    return `${date.getDate()} ${monthAbbrevTitle(date, language)}`;
}

/** The 24-hour form pads the hour as those locales write it; the 12-hour form must not ("09:04 PM"). */
export function formatTime(date: Date, use24Hour = false, language: Language = runtimeLanguage()): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const mm = String(minutes).padStart(2, "0");
    if (use24Hour) {
        return `${String(hours).padStart(2, "0")}:${mm}`;
    }
    const meridiem = dateName(hours >= 12 ? "dates.meridiem.pm" : "dates.meridiem.am", language);
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${mm} ${meridiem}`;
}

export function monthLongTitle(date: Date, language: Language = runtimeLanguage()): string {
    return dateName(`dates.monthLong.${date.getMonth()}`, language);
}

/** Always with the year: a target is far away, and "24 Jun" would read as this year. */
export function formatTargetMonth(date: Date, language: Language = runtimeLanguage()): string {
    return `${monthAbbrevTitle(date, language)} ${date.getFullYear()}`;
}

export function formatTargetDate(date: Date, language: Language = runtimeLanguage()): string {
    return `${date.getDate()} ${formatTargetMonth(date, language)}`;
}

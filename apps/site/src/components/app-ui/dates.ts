import { addDays, startOfDay } from "@outlayr/money/calendar";
import type { Locale } from "@outlayr/shared/i18n";

import type { AppKey, AppT } from "./strings";

const TWELVE_HOUR = {
    de: false,
    en: true,
    es: true,
    fr: false,
    it: false,
    ja: false,
    ko: true,
    nl: false,
    pt: false,
} as const satisfies Record<Locale, boolean>;

const UNIT_DATE = {
    ja: { day: "日", dayGap: "", weekdayGap: "", yearGap: "年" },
    ko: { day: "일", dayGap: " ", weekdayGap: " ", yearGap: "년 " },
} as const;

type UnitDateLocale = keyof typeof UNIT_DATE;

const isUnitDate = (locale: Locale): locale is UnitDateLocale => locale === "ja" || locale === "ko";

export const SUNDAY = 1;

export const WEEKDAYS = [
    "dates.weekday.0",
    "dates.weekday.1",
    "dates.weekday.2",
    "dates.weekday.3",
    "dates.weekday.4",
    "dates.weekday.5",
    "dates.weekday.6",
] as const satisfies readonly AppKey[];

export const WEEKDAYS_LONG = [
    "dates.weekdayLong.0",
    "dates.weekdayLong.1",
    "dates.weekdayLong.2",
    "dates.weekdayLong.3",
    "dates.weekdayLong.4",
    "dates.weekdayLong.5",
    "dates.weekdayLong.6",
] as const satisfies readonly AppKey[];

export const WEEKDAY_INITIALS = [
    "dates.weekdayInitial.0",
    "dates.weekdayInitial.1",
    "dates.weekdayInitial.2",
    "dates.weekdayInitial.3",
    "dates.weekdayInitial.4",
    "dates.weekdayInitial.5",
    "dates.weekdayInitial.6",
] as const satisfies readonly AppKey[];

export const MONTHS = [
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

export const MONTHS_LONG = [
    "dates.monthLong.0",
    "dates.monthLong.1",
    "dates.monthLong.2",
    "dates.monthLong.3",
    "dates.monthLong.4",
    "dates.monthLong.5",
    "dates.monthLong.6",
    "dates.monthLong.7",
    "dates.monthLong.8",
    "dates.monthLong.9",
    "dates.monthLong.10",
    "dates.monthLong.11",
] as const satisfies readonly AppKey[];

const unitMonthDay = (date: Date, t: AppT, style: (typeof UNIT_DATE)[UnitDateLocale]) =>
    `${t(MONTHS[date.getMonth()] ?? "dates.month.0")}${style.dayGap}${date.getDate()}${style.day}`;

const unitTitle = (day: Date, now: Date, locale: UnitDateLocale, t: AppT) => {
    const style = UNIT_DATE[locale];
    const base = `${unitMonthDay(day, t, style)}${style.weekdayGap}(${t(WEEKDAYS[day.getDay()] ?? "dates.weekday.0")})`;
    return day.getFullYear() < now.getFullYear() ? `${day.getFullYear()}${style.yearGap}${base}` : base;
};

export const dayOfMonth = (date: Date, locale: Locale) =>
    locale === "de" ? `${date.getDate()}.` : String(date.getDate());

export const dayMonth = (date: Date, locale: Locale, t: AppT) =>
    isUnitDate(locale)
        ? unitMonthDay(date, t, UNIT_DATE[locale])
        : `${dayOfMonth(date, locale)} ${t(MONTHS[date.getMonth()] ?? "dates.month.0")}`;

export const monthLongTitle = (date: Date, t: AppT) => t(MONTHS_LONG[date.getMonth()] ?? "dates.monthLong.0");

export function formatDayTitle(day: Date, now: Date, locale: Locale, t: AppT): string {
    const target = startOfDay(day).getTime();
    if (target === startOfDay(now).getTime()) {
        return t("common.today");
    }
    if (target === startOfDay(addDays(now, -1)).getTime()) {
        return t("common.yesterday");
    }
    if (isUnitDate(locale)) {
        return unitTitle(day, now, locale, t);
    }
    const base = `${t(WEEKDAYS[day.getDay()] ?? "dates.weekday.0")}, ${dayOfMonth(day, locale)} ${t(MONTHS[day.getMonth()] ?? "dates.month.0")}`;
    return day.getFullYear() < now.getFullYear() ? `${base} '${String(day.getFullYear()).slice(-2)}` : base;
}

export function formatTime(date: Date, locale: Locale, t: AppT): string {
    const hours = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, "0");
    if (!TWELVE_HOUR[locale]) {
        return `${String(hours).padStart(2, "0")}:${mm}`;
    }
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const meridiem = t(hours >= 12 ? "dates.meridiem.pm" : "dates.meridiem.am");
    return locale === "ko" ? `${meridiem} ${hour12}:${mm}` : `${hour12}:${mm} ${meridiem}`;
}

export function formatDateHeader(day: Date, now: Date, locale: Locale, t: AppT): string {
    if (isUnitDate(locale)) {
        return unitTitle(day, now, locale, t);
    }
    const base = `${t(WEEKDAYS[day.getDay()] ?? "dates.weekday.0").toUpperCase()}, ${dayOfMonth(day, locale)} ${t(MONTHS[day.getMonth()] ?? "dates.month.0").toUpperCase()}`;
    return day.getFullYear() < now.getFullYear() ? `${base} '${String(day.getFullYear()).slice(-2)}` : base;
}

export function formatClock(date: Date, locale: Locale): string {
    const hours = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, "0");
    return TWELVE_HOUR[locale]
        ? `${hours % 12 === 0 ? 12 : hours % 12}:${mm}`
        : `${String(hours).padStart(2, "0")}:${mm}`;
}

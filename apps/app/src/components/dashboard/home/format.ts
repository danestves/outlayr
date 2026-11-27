import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES } from "@outlayr/shared/i18n";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { LedgerCategory } from "@/lib/dashboard-series-ledger";
import type { Period } from "@/lib/dashboard-series-period";
import { useNumberLocale } from "@/lib/exchange-locale";

const WEEKDAY_LEAD = /^([^\s,]+),?\s/;
const SUNDAY_NOON = Date.UTC(2023, 11, 31, 12);
const DAY_MS = 86_400_000;
const WEEK = 7;

export function useDateFormat() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[locale];
    return useMemo(() => {
        // The redesign reads "Oct 28" in English; the site's en-GB date locale would flip it.
        const dated = date === "en-GB" ? "en-US" : date;
        const short = new Intl.DateTimeFormat(dated, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });
        const withYear = new Intl.DateTimeFormat(dated, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
            year: "numeric",
        });
        const withWeekday = new Intl.DateTimeFormat(dated, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
            weekday: "short",
        });
        const month = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        const monthYear = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" });
        return {
            day: (day: string) => short.format(wallNoon(day)),
            full: (day: string) => withYear.format(wallNoon(day)),
            month: (key: string) => month.format(wallNoon(`${key}-15`)),
            monthYear: (key: string) => monthYear.format(wallNoon(`${key}-15`)),
            weekday: (day: string) => withWeekday.format(wallNoon(day)).replace(WEEKDAY_LEAD, "$1, "),
        };
    }, [date]);
}

/** `firstWeekday` is 1 for Sunday and 2 for Monday, as the ledger stores it. */
export function useWeekLetters(firstWeekday: number) {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(LANGUAGES[locale].date, {
            timeZone: "UTC",
            weekday: "narrow",
        });
        return Array.from({ length: WEEK }, (_, index) =>
            format.format(SUNDAY_NOON + (firstWeekday - 1 + index) * DAY_MS)
        );
    }, [firstWeekday, locale]);
}

export const titled = (name: string, locale: string) => `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)}`;

export function useCategoryName() {
    const { uncategorized } = useIntlayer("dashboard-home");
    const { locale } = useLocale();
    return (category: Pick<LedgerCategory, "id" | "name">) =>
        category.id === UNCATEGORIZED_ID ? uncategorized.value : titled(category.name, locale);
}

const YEAR_LENGTH = 4;

export function categoryTone(color: string | undefined) {
    const tone: CSSProperties & { "--pu-color"?: string } = color ? { "--pu-color": color } : {};
    return tone;
}

export function usePeriodTitle(firstDayOfMonth: number, currentKey: string) {
    const date = useDateFormat();
    const { locale } = useLocale();
    return (period: Period) => {
        const title =
            firstDayOfMonth === 1
                ? titled(date.month(period.key), locale)
                : `${date.day(period.from)} - ${date.day(period.to)}`;
        const year = period.key.slice(0, YEAR_LENGTH);
        return year === currentKey.slice(0, YEAR_LENGTH) ? title : `${title} ${year}`;
    };
}

export function useRangeTitle() {
    const date = useDateFormat();
    const { filters: copy } = useIntlayer("dashboard");
    return ({ from, to }: Pick<Period, "from" | "to">) => {
        if (from === to) {
            return date.day(from);
        }
        const day = from.slice(0, YEAR_LENGTH) === to.slice(0, YEAR_LENGTH) ? date.day : date.full;
        return copy.rangeLabel({ from: day(from), to: day(to) }).value;
    };
}

export function useMonthYear() {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC", year: "numeric" });
        return (day: string) => format.format(wallNoon(day)).replace(".", "");
    }, [locale]);
}

export function useWholeMoney(currency: string) {
    const numberLocale = useNumberLocale();
    return useMemo(() => {
        const whole = new Intl.NumberFormat(numberLocale, {
            currency,
            maximumFractionDigits: 0,
            style: "currency",
        });
        const compact = new Intl.NumberFormat(numberLocale, {
            currency,
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
        });
        return { compact: (amount: number) => compact.format(amount), whole: (amount: number) => whole.format(amount) };
    }, [currency, numberLocale]);
}

export const percentChange = (delta: number) => `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`;

export const timeOfDay = (instant: number, offset: number) => new Date(instant + offset).toISOString().slice(11, 16);

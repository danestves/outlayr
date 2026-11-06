import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { LedgerCategory } from "@/lib/dashboard-series-ledger";
import type { Period } from "@/lib/dashboard-series-period";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";

const noonOf = (day: string) => Date.parse(`${day}T12:00:00Z`);

const WEEKDAY_LEAD = /^([^\s,]+),?\s/;

export function useDateFormat() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const short = new Intl.DateTimeFormat(date, { day: "numeric", month: "short", timeZone: "UTC" });
        const withWeekday = new Intl.DateTimeFormat(date, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
            weekday: "short",
        });
        const month = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        return {
            day: (day: string) => short.format(noonOf(day)),
            month: (key: string) => month.format(noonOf(`${key}-15`)),
            weekday: (day: string) => withWeekday.format(noonOf(day)).replace(WEEKDAY_LEAD, "$1, "),
        };
    }, [date]);
}

export const titled = (name: string, locale: string) => `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)}`;

export function useCategoryName() {
    const { uncategorized } = useIntlayer("dashboard-home");
    const { locale } = useLocale();
    return (category: Pick<LedgerCategory, "id" | "name">) =>
        category.id === UNCATEGORIZED_ID ? uncategorized.value : titled(category.name, locale);
}

export function usePeriodTitle(firstDayOfMonth: number) {
    const date = useDateFormat();
    const { locale } = useLocale();
    return (period: Period) =>
        firstDayOfMonth === 1
            ? titled(date.month(period.key), locale)
            : `${date.day(period.from)} - ${date.day(period.to)}`;
}

export function useWholeMoney(currency: string) {
    return useMemo(() => {
        const whole = new Intl.NumberFormat("en-US", { currency, maximumFractionDigits: 0, style: "currency" });
        const compact = new Intl.NumberFormat("en-US", {
            currency,
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
        });
        return { compact: (amount: number) => compact.format(amount), whole: (amount: number) => whole.format(amount) };
    }, [currency]);
}

export const timeOfDay = (instant: number, offset: number) => new Date(instant + offset).toISOString().slice(11, 16);

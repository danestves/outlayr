import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { addDays } from "@/lib/ledger";

const YEAR = 4;
const WEEKDAY_LEAD = /^([^\s,]+),?\s/u;

/** "Sat, Nov 7" in English: the site's en-GB date locale would flip it to "Sat, 7 Nov". */
export function useWeekday() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
            weekday: "short",
        });
        return (day: string) => format.format(wallNoon(day)).replace(WEEKDAY_LEAD, "$1, ");
    }, [date]);
}

/** A day as `lead` ("Today") and `date` ("Sun, Nov 8"), with the year once it isn't this one. */
export function useDayParts() {
    const { ledger } = useDashboard();
    const { today, yesterday } = useIntlayer("dashboard-transactions");
    const weekday = useWeekday();
    const before = addDays(ledger.today, -1);
    return (day: string) => {
        const date = weekday(day);
        if (day === ledger.today) {
            return { date, lead: today.value };
        }
        if (day === before) {
            return { date, lead: yesterday.value };
        }
        return {
            date: day.slice(0, YEAR) === ledger.today.slice(0, YEAR) ? date : `${date} ${day.slice(0, YEAR)}`,
            lead: null,
        };
    };
}

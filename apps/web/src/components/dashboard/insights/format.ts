import { useMemo } from "react";
import { useLocale } from "react-intlayer";

import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { Period } from "@/lib/dashboard-series-period";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

const noon = (day: string) => Date.parse(`${day}T12:00:00Z`);

export function useInsightsFormat({
    currency,
    firstDayOfMonth,
    today,
}: Pick<Ledger, "currency" | "firstDayOfMonth" | "today">) {
    const { locale } = useLocale();
    const { money } = useDisplayFormat();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const dayFormat = new Intl.DateTimeFormat(date, { day: "numeric", month: "short", timeZone: "UTC" });
        const shortMonth = new Intl.DateTimeFormat(date, { month: "short", timeZone: "UTC" });
        const longMonth = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        const longMonthYear = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" });
        const compact = new Intl.NumberFormat("en-US", {
            currency,
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
        });
        const day = (value: string) => dayFormat.format(noon(value));
        return {
            amount: (value: number) => money(value, currency),
            compact: (value: number) => compact.format(value).replace(/K$/, "k"),
            day,
            signed: (value: number) => money(value, currency, "always"),
            signedWhole: (value: number) => moneyIn(value, currency, "always", false),
            month: (key: string) => shortMonth.format(noon(`${key}-15`)),
            periodName: (period: Period) => {
                if (firstDayOfMonth !== 1) {
                    return `${day(period.from)} - ${day(period.to)}`;
                }
                const sameYear = period.from.slice(0, 4) === today.slice(0, 4);
                return (sameYear ? longMonth : longMonthYear).format(noon(period.from));
            },
        };
    }, [currency, date, firstDayOfMonth, money, today]);
}

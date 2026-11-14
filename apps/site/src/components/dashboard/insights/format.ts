import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKindOf } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

export function useInsightsFormat({
    currency,
    firstDayOfMonth,
    today,
}: Pick<Ledger, "currency" | "firstDayOfMonth" | "today">) {
    const { locale } = useLocale();
    const { money } = useDisplayFormat();
    const { date } = LANGUAGES[localeFromParam(locale)];
    const { range } = useIntlayer("dashboard-insights-bar");
    return useMemo(() => {
        // The web frames read "Oct 28"; the site's en-GB date locale would flip it.
        const dated = date === "en-GB" ? "en-US" : date;
        const dayOfMonth = new Intl.DateTimeFormat(dated, { day: "numeric", timeZone: "UTC" });
        const monthDay = new Intl.DateTimeFormat(dated, { day: "numeric", month: "short", timeZone: "UTC" });
        const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" });
        const dayFormat = new Intl.DateTimeFormat(date, { day: "numeric", month: "short", timeZone: "UTC" });
        const shortMonth = new Intl.DateTimeFormat(dated, { month: "short", timeZone: "UTC" });
        const longMonth = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        const longMonthYear = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" });
        const compact = new Intl.NumberFormat("en-US", {
            currency,
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
        });
        const day = (value: string) => dayFormat.format(wallNoon(value));
        const shortDate = (value: string) => monthDay.format(wallNoon(value)).replace(".", "");
        const between = (from: string, to: string) =>
            range({
                from: shortDate(from),
                to: from.slice(0, 7) === to.slice(0, 7) ? dayOfMonth.format(wallNoon(to)) : shortDate(to),
            }).value;
        const spanKind = (span: Period) => periodKindOf(span.key) ?? "month";
        return {
            amount: (value: number) => money(value, currency),
            axis: (value: number) => plain.format(value).toLowerCase(),
            compact: (value: number) => compact.format(value).replace(/K$/, "k"),
            date: shortDate,
            day,
            longMonth: (value: string) => longMonth.format(wallNoon(value)),
            signed: (value: number) => money(value, currency, "always"),
            spanName: (span: Period) => {
                const kind = spanKind(span);
                if (kind === "year") {
                    return span.key;
                }
                return kind === "month" && firstDayOfMonth === 1
                    ? longMonthYear.format(wallNoon(span.from))
                    : between(span.from, span.to);
            },
            /** The span without its year: "October", "Oct 25 to 31" or "2026". */
            spanShort: (span: Period) => {
                const kind = spanKind(span);
                if (kind === "year") {
                    return span.key;
                }
                return kind === "month" && firstDayOfMonth === 1
                    ? longMonth.format(wallNoon(span.from))
                    : between(span.from, span.to);
            },
            /** The span as an axis label: "Oct", "Oct 25" or "2026". */
            spanTick: (span: Period) => {
                const kind = spanKind(span);
                if (kind === "year") {
                    return span.key;
                }
                return kind === "month" && firstDayOfMonth === 1
                    ? shortMonth.format(wallNoon(span.from)).replace(".", "")
                    : shortDate(span.from);
            },
            whole: (value: number) => moneyIn(value, currency, "auto", false),
            signedWhole: (value: number) => moneyIn(value, currency, "always", false),
            month: (key: string) => shortMonth.format(wallNoon(`${key}-15`)),
            periodName: (period: Period) => {
                if (firstDayOfMonth !== 1) {
                    return `${day(period.from)} - ${day(period.to)}`;
                }
                const sameYear = period.from.slice(0, 4) === today.slice(0, 4);
                return (sameYear ? longMonth : longMonthYear).format(wallNoon(period.from));
            },
        };
    }, [currency, date, firstDayOfMonth, money, range, today]);
}

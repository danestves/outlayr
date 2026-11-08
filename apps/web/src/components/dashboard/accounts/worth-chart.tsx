import { AreaChart } from "panelui-web/area-chart";
import { useMemo } from "react";
import { useLocale } from "react-intlayer";

import { useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { useDisplayFormat } from "@/lib/ledger-settings";

import type { WorthRange } from "./model";
import { useChartRatio } from "./parts";

const TINT = "var(--color-app-tint)";
const DAILY_TICKS = 6;
const THOUSAND = 1000;
const Y_TICKS = 4;
const FINE_STEP = 100;

export interface WorthDatum {
    [key: string]: number | string;
    day: string;
    value: number;
}

export function useMonthShort() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const short = new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, {
            month: "short",
            timeZone: "UTC",
        });
        return (day: string) => short.format(Date.parse(`${day}T12:00:00Z`)).replace(".", "");
    }, [date]);
}

const STEPS = 3;
const NICE = [1, 2, 2.5, 5, 10];

/** Three even steps that hug the data, so a small change still reads as a slope. */
export function niceDomain(values: readonly number[]): [number, number] {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const raw = (high - low || Math.abs(high) || 1) / STEPS;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = (NICE.find((each) => each * power >= raw) ?? 10) * power;
    const bottom = Math.floor(low / step) * step;
    const top = Math.max(bottom + step * STEPS, Math.ceil(high / step) * step);
    return [bottom, top];
}

/** One series over time: a tinted band with axes, as the accounts mocks draw it. */
export function WorthChart({
    aspectRatio,
    currency,
    data,
    label,
    range,
}: {
    aspectRatio: number;
    /** Defaults to the main currency. */
    currency?: string;
    data: readonly WorthDatum[];
    label: string;
    range: WorthRange;
}) {
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const month = useMonthShort();
    const shownIn = currency ?? ledger.currency;
    const { compact, whole } = useWholeMoney(shownIn);
    const monthly = range !== "month" && range !== "quarter";
    const ratio = useChartRatio(aspectRatio);
    const [floor, top] = niceDomain(data.map((datum) => datum.value));
    // The band always fills down to zero, so values sit on the domain floor to keep it inside the plot.
    const lifted = useMemo(() => data.map((datum) => ({ ...datum, value: datum.value - floor })), [data, floor]);
    const axis = (offset: number) => {
        // The floor label would sit on the first x label, which already marks the bottom edge.
        if (offset === 0) {
            return "";
        }
        const value = offset + floor;
        // Steps under a hundred would round to the same compact label twice.
        if ((top - floor) / Y_TICKS < FINE_STEP) {
            return whole(value);
        }
        return Math.abs(value) >= THOUSAND
            ? compact(value).replace(/(\.\d)?K$/u, (_, tenth) => `${tenth ?? ".0"}k`)
            : compact(value);
    };
    return (
        <AreaChart
            aspectRatio={ratio}
            curve="linear"
            data={lifted}
            label={label}
            xDataKey="day"
            yDomain={[0, top - floor]}
        >
            <AreaChart.Grid dashArray="0" opacity={1} rows={Y_TICKS} />
            <AreaChart.Area color={TINT} dataKey="value" fillOpacity={0.22} gradientToOpacity={0} strokeWidth={1.75} />
            <AreaChart.XAxis
                format={(datum) => (monthly ? month(String(datum.day)) : date.day(String(datum.day)))}
                ticks={monthly ? undefined : DAILY_TICKS}
            />
            <AreaChart.YAxis format={axis} ticks={Y_TICKS} />
            <AreaChart.Tooltip
                formatValue={(value) => money(value + floor, shownIn)}
                formatX={(datum) => date.day(String(datum.day))}
                labels={{ value: label }}
            />
        </AreaChart>
    );
}

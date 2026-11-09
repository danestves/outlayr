import { wallNoon } from "@outlayr/money/ledger-zone";
import { Plot } from "panelui-web/plot";
import { useMemo } from "react";
import { useLocale } from "react-intlayer";

import { useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { niceDomain } from "./model";
import type { WorthRange } from "./model";
import { useChartRatio } from "./parts";

const TINT = "var(--color-app-tint)";
const FILL = "worth-fill";
export const Y_LABEL = "dash-figure flex justify-end overflow-visible text-[11px]";
const DAILY_TICKS = 5;
const THOUSAND = 1000;
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
        return (day: string) => short.format(wallNoon(day)).replace(".", "");
    }, [date]);
}

const STEPS = 3;
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
    const domain = niceDomain(data.map((datum) => datum.value));
    const [floor, top] = domain;
    const last = data.at(-1);
    const marked = useMemo(
        () => data.map((datum) => (datum === last ? { ...datum, end: datum.value } : datum)),
        [data, last]
    );
    const axis = (value: number) => {
        // Steps under a hundred would round to the same compact label twice.
        if ((top - floor) / STEPS < FINE_STEP) {
            return whole(value);
        }
        return Math.abs(value) >= THOUSAND
            ? compact(value).replace(/(\.\d)?K$/u, (_, tenth) => `${tenth ?? ".0"}k`)
            : compact(value);
    };
    return (
        <>
            <svg aria-hidden className="absolute size-0">
                <defs>
                    <linearGradient id={FILL} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" style={{ stopColor: TINT, stopOpacity: 0.22 }} />
                        <stop offset="1" style={{ stopColor: TINT, stopOpacity: 0 }} />
                    </linearGradient>
                </defs>
            </svg>
            <Plot aspectRatio={ratio} curve="linear" data={marked} label={label} xDataKey="day" yDomain={domain}>
                <Plot.Grid dashArray="" rows={STEPS} />
                <Plot.Area color={`url(#${FILL})`} dataKey="value" opacity={1} />
                <Plot.Line color={TINT} dataKey="value" strokeWidth={1.75} />
                <Plot.Dots color={TINT} dataKey="end" ringWidth={0} size={3.5} />
                <Plot.XAxis
                    className="dash-figure text-[11px]"
                    format={(datum) => (monthly ? month(String(datum.day)) : date.day(String(datum.day)))}
                    ticks={monthly ? data.length : DAILY_TICKS}
                />
                <Plot.YAxis className={Y_LABEL} format={axis} ticks={STEPS} />
                <Plot.Cursor showLine={false} />
                <Plot.Tooltip
                    formatValue={(value) => money(value, shownIn)}
                    formatX={(datum) => date.day(String(datum.day))}
                >
                    {(datum) => (
                        <>
                            <div className="text-muted-foreground">{date.day(String(datum.day))}</div>
                            <div className="dash-figure">{money(Number(datum.value), shownIn)}</div>
                        </>
                    )}
                </Plot.Tooltip>
            </Plot>
        </>
    );
}

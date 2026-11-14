import { Plot, usePlot, xOf, yOf } from "panelui-web/plot";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { SkeletonBox } from "skullet/react";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useSampled } from "@/components/dashboard/shell/sampled";

import { useInsightsFormat } from "../format";
import { Bones, FIGURE, NOTE, Tray } from "../parts";
import { axisOf } from "./model";
import type { PacePoint } from "./model";

const TINT = "var(--color-app-tint)";
const USUAL = "#7c7a6c";
const AXIS = `${FIGURE} text-[11px]`;
const WEEK_DAYS = 7;
const MONTH_DAYS = 31;
const MONTH_KEY_LENGTH = 7;

interface Tick {
    index: number;
    label: string;
}

/** Day labels where the frame puts them: every day of a week, every seventh of a month, each month of a year. */
function DayTicks({ ticks }: { ticks: readonly Tick[] }) {
    const { data, plot } = usePlot();
    return (
        <Plot.Overlay>
            {ticks.map(({ index, label }) => (
                <span
                    className={`${AXIS} text-muted-foreground pointer-events-none absolute -bottom-[3px] -translate-x-1/2 whitespace-nowrap`}
                    key={index}
                    style={{ left: xOf(index, data.length, plot) }}
                >
                    {label}
                </span>
            ))}
        </Plot.Overlay>
    );
}

const HALF_LABEL = 7;

function ValueTicks({ format, values }: { format: (value: number) => string; values: readonly number[] }) {
    const { extent, plot } = usePlot();
    const [floor, top] = extent;
    return (
        <Plot.Overlay>
            {values.map((value) => (
                <span
                    className={`${AXIS} text-muted-foreground pointer-events-none absolute -left-7 leading-[14px]`}
                    key={value}
                    style={{ top: yOf(value, plot, floor, top) - HALF_LABEL }}
                >
                    {format(value)}
                </span>
            ))}
        </Plot.Overlay>
    );
}

/** A tag pinned above the last point of the line, as the frame labels where the span stands today. */
function EndTag({ children, index, value }: { children: ReactNode; index: number; value: number }) {
    const { data, extent, plot } = usePlot();
    const [floor, top] = extent;
    return (
        <Plot.Overlay>
            <span
                className={`${FIGURE} bg-foreground text-background pointer-events-none absolute z-10 flex h-6 min-w-[104px] -translate-x-full items-center justify-center rounded-md px-2 text-xs font-semibold whitespace-nowrap`}
                style={{ left: xOf(index, data.length, plot), top: yOf(value, plot, floor, top) - 34 }}
            >
                {children}
            </span>
        </Plot.Overlay>
    );
}

interface PaceChartProps {
    aspectRatio: number;
    label: string;
    names: { spent: string; usual: string };
    points: readonly PacePoint[];
    tag?: (amount: string) => ReactNode;
}

export function PaceChart({ aspectRatio, label, names, points, tag }: PaceChartProps) {
    const { ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const last = points.findLastIndex((point) => point.spent !== null);
    const data = useMemo(
        () => points.map((point, index) => (index === last ? { ...point, end: point.spent } : point)),
        [last, points]
    );
    const { roomy, step } = axisOf(Math.max(...points.map((point) => Math.max(point.spent ?? 0, point.usual ?? 0))));
    const rules = Array.from({ length: Math.floor(roomy / step) + 1 }, (_, index) => index * step);
    const end = points[last]?.spent ?? null;
    const ticks = points.flatMap(({ day }, index): Tick[] => {
        if (points.length > MONTH_DAYS) {
            return day.endsWith("-01") ? [{ index, label: fmt.month(day.slice(0, MONTH_KEY_LENGTH)) }] : [];
        }
        return points.length <= WEEK_DAYS || index % WEEK_DAYS === 0 ? [{ index, label: fmt.date(day) }] : [];
    });
    return (
        <Plot aspectRatio={aspectRatio} curve="linear" data={data} label={label} xDataKey="day" yDomain={[0, roomy]}>
            {rules.map((value) => (
                <Plot.Rule color="var(--color-border)" key={value} y={value} />
            ))}
            <Plot.Line color={USUAL} dashArray="4 4" dataKey="usual" strokeWidth={1.5} />
            <Plot.Area color={TINT} dataKey="spent" opacity={0.1} />
            <Plot.Line color={TINT} dataKey="spent" strokeWidth={2} />
            <Plot.Dots color={TINT} dataKey="end" ringWidth={2} size={4} />
            <DayTicks ticks={ticks} />
            <ValueTicks format={fmt.axis} values={rules} />
            <Plot.Cursor showLine={false} />
            <Plot.Tooltip>
                {(datum) => (
                    <>
                        <div className="text-muted-foreground">{fmt.date(String(datum.day))}</div>
                        {datum.spent === null || datum.spent === undefined ? null : (
                            <div className={`${FIGURE} flex justify-between gap-4`}>
                                <span className="font-sans">{names.spent}</span>
                                {fmt.amount(Number(datum.spent))}
                            </div>
                        )}
                        {datum.usual === null || datum.usual === undefined ? null : (
                            <div className={`${FIGURE} text-muted-foreground flex justify-between gap-4`}>
                                <span className="font-sans">{names.usual}</span>
                                {fmt.amount(Number(datum.usual))}
                            </div>
                        )}
                    </>
                )}
            </Plot.Tooltip>
            {tag && end !== null && last !== -1 ? (
                <EndTag index={last} value={end}>
                    {tag(fmt.whole(end))}
                </EndTag>
            ) : null}
        </Plot>
    );
}

function Key({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
    return (
        <span className="flex items-center gap-1.5">
            {dashed ? (
                <span aria-hidden className="w-3 border-t-2 border-dashed" style={{ borderColor: USUAL }} />
            ) : (
                <span aria-hidden className="h-0.5 w-3 rounded-sm" style={{ background: TINT }} />
            )}
            {children}
        </span>
    );
}

interface PaceCardProps extends PaceChartProps {
    className?: string;
    headline: ReactNode;
    line: ReactNode;
    usualShown: boolean;
}

const BONE_RULES = ["10%", "30%", "50%", "70%", "90%"];

function PaceBones({ aspectRatio }: { aspectRatio: number }) {
    return (
        <Bones className="relative" style={{ aspectRatio }}>
            {BONE_RULES.map((top) => (
                <span className="border-border absolute inset-x-0 block border-t" key={top} style={{ top }}>
                    <SkeletonBox className="absolute -top-[5px] -left-9" height={10} radius={3} width={20} />
                </span>
            ))}
        </Bones>
    );
}

/** The lead card of the Overview: where spending stands against the same days of earlier spans. */
export function PaceCard({ className = "", headline, line, usualShown, ...chart }: PaceCardProps) {
    const sampled = useSampled();
    return (
        <Tray className={className}>
            <div className="flex items-start gap-3 px-5 pt-4">
                <div className="min-w-0">
                    <h2 className="text-xl leading-7 font-semibold tracking-[-0.02em]">{headline}</h2>
                    <p className={NOTE}>{line}</p>
                </div>
                {usualShown && !sampled ? (
                    <div className="text-muted-foreground ml-auto flex shrink-0 gap-3.5 pt-2 text-xs">
                        <Key>{chart.names.spent}</Key>
                        <Key dashed>{chart.names.usual}</Key>
                    </div>
                ) : null}
            </div>
            <div className="mt-1.5 pr-4 pb-4 pl-12">
                {sampled ? <PaceBones aspectRatio={chart.aspectRatio} /> : <PaceChart {...chart} />}
            </div>
        </Tray>
    );
}

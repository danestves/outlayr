import { Plot } from "panelui-web/plot";
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

// Plot's own padding in panelui-web 0.17. The frame is drawn here, outside Plot, because Plot
// draws only after it measures in the browser, and a server page would arrive without it.
const PAD = { bottom: 22, left: 10, right: 10, top: 12 };

const xAt = (index: number, total: number) =>
    total <= 1 ? "50%" : `calc(${PAD.left}px + (100% - ${PAD.left + PAD.right}px) * ${index / (total - 1)})`;

const yAt = (value: number, top: number, shift = 0) =>
    `calc(${PAD.top}px + (100% - ${PAD.top + PAD.bottom}px) * ${1 - value / top} - ${shift}px)`;

const HALF_LABEL = 7;
const TAG_RISE = 34;

interface FrameProps {
    end: number | null;
    format: (value: number) => string;
    last: number;
    rules: readonly number[];
    tag: ReactNode;
    ticks: readonly Tick[];
    top: number;
    total: number;
}

/** Rules, axis labels and the tag above today's point, in the places Plot puts its marks. */
function Frame({ end, format, last, rules, tag, ticks, top, total }: FrameProps) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
            {rules.map((value) => (
                <div
                    className="border-border absolute border-t"
                    key={value}
                    style={{ left: PAD.left, right: PAD.right, top: yAt(value, top) }}
                />
            ))}
            {rules.map((value) => (
                <span
                    className={`${AXIS} text-muted-foreground absolute -left-7 leading-[14px]`}
                    key={value}
                    style={{ top: yAt(value, top, HALF_LABEL) }}
                >
                    {format(value)}
                </span>
            ))}
            {ticks.map(({ index, label }) => (
                <span
                    className={`${AXIS} text-muted-foreground absolute -bottom-[3px] -translate-x-1/2 whitespace-nowrap`}
                    key={index}
                    style={{ left: xAt(index, total) }}
                >
                    {label}
                </span>
            ))}
            {tag && end !== null && last !== -1 ? (
                <span
                    className={`${FIGURE} bg-foreground text-background absolute z-10 flex h-6 min-w-[104px] -translate-x-full items-center justify-center rounded-md px-2 text-xs font-semibold whitespace-nowrap`}
                    style={{ left: xAt(last, total), top: yAt(end, top, TAG_RISE) }}
                >
                    {tag}
                </span>
            ) : null}
        </div>
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
        <div className="relative">
            <Plot
                aspectRatio={aspectRatio}
                curve="linear"
                data={data}
                label={label}
                xDataKey="day"
                yDomain={[0, roomy]}
            >
                <Plot.Line color={USUAL} dashArray="4 4" dataKey="usual" strokeWidth={1.5} />
                <Plot.Area color={TINT} dataKey="spent" opacity={0.1} />
                <Plot.Line color={TINT} dataKey="spent" strokeWidth={2} />
                <Plot.Dots color={TINT} dataKey="end" ringWidth={2} size={4} />
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
            </Plot>
            <Frame
                end={end}
                format={fmt.axis}
                last={last}
                rules={rules}
                tag={tag && end !== null ? tag(fmt.whole(end)) : null}
                ticks={ticks}
                top={roomy}
                total={points.length}
            />
        </div>
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

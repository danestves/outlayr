import { useId } from "react";

import { hatchPathD } from "../../../../native/src/lib/chart-paths";
import { CHART_DASH, CHART_SCRUB, dashArray } from "../../../../native/src/theme/chart";
import type { Burndown, BurndownPoint } from "./budgets-burndown";

const PAD = { bottom: 10, left: 4, right: 4, top: 10 } as const;
const THUMB_PAD = { bottom: 4, left: 4, right: 4, top: 4 } as const;

type Pad = typeof PAD | typeof THUMB_PAD;

const PAINT = {
    actual: 2.2,
    axis: 1.6,
    hatch: 1.6,
    hatchAlpha: 0.55,
    ideal: 1,
    markerAlpha: 0.55,
    projection: 1.6,
    runway: { radius: 3.4, width: 2 },
    surplusAlpha: 0.07,
} as const;

interface Plot {
    plotBottom: number;
    plotLeft: number;
    plotRight: number;
    plotTop: number;
    x: (day: number) => number;
    y: (value: number) => number;
    zeroY: number;
}

function makePlot(burndown: Burndown, limit: number, width: number, height: number, pad: Pad): Plot {
    const plotLeft = pad.left;
    const plotRight = width - pad.right;
    const span = Math.max(1, burndown.totalDays - 1);
    const candidates = [limit, 0, ...burndown.points.map((point) => point.balance)];
    if (burndown.projectedBalance != null) {
        candidates.push(burndown.projectedBalance);
    }
    const rawTop = Math.max(...candidates);
    const rawBottom = Math.min(...candidates);
    const range = Math.max(1, rawTop - rawBottom);
    const plotTop = pad.top;
    const plotBottom = height - pad.bottom;
    const y = (value: number) => {
        const clamped = Math.min(rawTop, Math.max(rawBottom, value));
        return plotTop + ((rawTop - clamped) / range) * (plotBottom - plotTop);
    };
    return {
        plotBottom,
        plotLeft,
        plotRight,
        plotTop,
        x: (day) => plotLeft + ((day - 1) / span) * (plotRight - plotLeft),
        y,
        zeroY: y(0),
    };
}

function actualPathD(burndown: Burndown, limit: number, plot: Plot): string {
    const parts = [`M ${plot.x(1)} ${plot.y(limit)}`];
    let previous = limit;
    for (const point of burndown.points) {
        parts.push(`L ${plot.x(point.day)} ${plot.y(previous)}`, `L ${plot.x(point.day)} ${plot.y(point.balance)}`);
        previous = point.balance;
    }
    return parts.join(" ");
}

function deficitPathD(burndown: Burndown, plot: Plot, last: BurndownPoint, crossX: number): string {
    const tail =
        burndown.projectedBalance == null
            ? `L ${plot.x(last.day)} ${plot.zeroY}`
            : `L ${plot.x(burndown.totalDays)} ${plot.y(burndown.projectedBalance)} L ${plot.x(burndown.totalDays)} ${plot.zeroY}`;
    return `M ${crossX} ${plot.zeroY} L ${crossX} ${plot.y(last.balance)} L ${plot.x(last.day)} ${plot.y(last.balance)} ${tail} Z`;
}

interface BurndownChartProps {
    burndown: Burndown;
    height: number;
    limit: number;
    thumbnail?: boolean;
    width: number;
}

export function BurndownChart({ burndown, height, limit, thumbnail = false, width }: BurndownChartProps) {
    const id = useId();
    const plot = makePlot(burndown, limit, width, height, thumbnail ? THUMB_PAD : PAD);
    const last = burndown.points.at(-1);
    const actual = actualPathD(burndown, limit, plot);
    const projected = burndown.projectedBalance;
    const runwayX = burndown.runwayDay == null ? null : plot.x(burndown.runwayDay);
    const deficit = runwayX != null && last ? deficitPathD(burndown, plot, last, runwayX) : null;
    const clip = { above: `${id}above`, below: `${id}below`, deficit: `${id}deficit` };
    return (
        <svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
            <defs>
                <clipPath id={clip.above}>
                    <rect height={plot.zeroY} width={width} x={0} y={0} />
                </clipPath>
                <clipPath id={clip.below}>
                    <rect height={height - plot.zeroY} width={width} x={0} y={plot.zeroY} />
                </clipPath>
                {deficit ? (
                    <clipPath id={clip.deficit}>
                        <path d={deficit} />
                    </clipPath>
                ) : null}
            </defs>
            <path
                d={`${actual} L ${plot.x(last?.day ?? 1)} ${plot.zeroY} L ${plot.x(1)} ${plot.zeroY} Z`}
                fill="var(--foreground)"
                fillOpacity={PAINT.surplusAlpha}
            />
            {deficit ? (
                <path
                    clipPath={`url(#${clip.deficit})`}
                    d={hatchPathD(width, height)}
                    fill="none"
                    stroke="var(--over-budget)"
                    strokeOpacity={PAINT.hatchAlpha}
                    strokeWidth={PAINT.hatch}
                />
            ) : null}
            <path
                d={`M ${plot.x(1)} ${plot.y(limit)} L ${plot.x(burndown.totalDays)} ${plot.y(0)}`}
                fill="none"
                stroke="var(--muted)"
                strokeDasharray={dashArray(CHART_DASH.reference)}
                strokeWidth={PAINT.ideal}
            />
            <path
                clipPath={`url(#${clip.above})`}
                d={actual}
                fill="none"
                stroke="var(--foreground)"
                strokeWidth={PAINT.actual}
            />
            <path
                clipPath={`url(#${clip.below})`}
                d={actual}
                fill="none"
                stroke="var(--over-budget)"
                strokeWidth={PAINT.actual}
            />
            {last && projected != null ? (
                <path
                    d={`M ${plot.x(last.day)} ${plot.y(last.balance)} L ${plot.x(burndown.totalDays)} ${plot.y(projected)}`}
                    fill="none"
                    stroke={projected < 0 ? "var(--over-budget)" : "var(--muted)"}
                    strokeDasharray={dashArray(CHART_DASH.projection)}
                    strokeWidth={PAINT.projection}
                />
            ) : null}
            <path
                d={`M ${plot.plotLeft} ${plot.zeroY} L ${plot.plotRight} ${plot.zeroY}`}
                fill="none"
                stroke="var(--foreground)"
                strokeWidth={PAINT.axis}
            />
            {runwayX == null ? null : (
                <circle
                    cx={runwayX}
                    cy={plot.zeroY}
                    fill="none"
                    r={PAINT.runway.radius}
                    stroke="var(--over-budget)"
                    strokeWidth={PAINT.runway.width}
                />
            )}
            {last ? (
                <>
                    <path
                        d={`M ${plot.x(last.day)} ${plot.plotTop - CHART_SCRUB.ruleOvershoot} L ${plot.x(last.day)} ${plot.plotBottom + CHART_SCRUB.ruleOvershoot}`}
                        fill="none"
                        stroke="var(--foreground)"
                        strokeOpacity={PAINT.markerAlpha}
                        strokeWidth={CHART_SCRUB.ruleWidth}
                    />
                    <circle
                        cx={plot.x(last.day)}
                        cy={plot.y(last.balance)}
                        fill={last.balance < 0 ? "var(--over-budget)" : "var(--foreground)"}
                        r={CHART_SCRUB.dotRadius}
                    />
                </>
            ) : null}
        </svg>
    );
}

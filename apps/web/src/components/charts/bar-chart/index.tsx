import { barY, defineChart } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { ReactNode } from "react";

import {
    CHART_HOST_CLASS,
    CHART_THEME,
    ChartDataTable,
    ChartLegend,
    definePart,
    labelAt,
    numberAt,
    partsOf,
    referenceLineMarks,
    xAxisOf,
    yGuidesOf,
} from "../shared";
import type {
    ChartDatum,
    ChartGridProps,
    ChartReferenceLineProps,
    ChartTooltipProps,
    ChartXAxisProps,
    ChartYAxisProps,
    FormatX,
} from "../shared";
import { stackBands } from "../shared/layout";

export interface BarChartBarProps {
    color: string;
    dataKey: string;
    label?: string;
}

export interface BarChartLegendProps {
    className?: string;
    labels?: Readonly<Record<string, string>>;
}

export interface BarChartTrackProps {
    color?: string;
    length?: number;
}

export interface BarChartProps {
    ariaDescription?: string;
    ariaLabel: string;
    aspectRatio?: number;
    barGap?: number;
    barWidth?: number;
    children: ReactNode;
    className?: string;
    columnOpacity?: (datum: ChartDatum, index: number) => number;
    compact?: boolean;
    cornerRadius?: number;
    data: readonly ChartDatum[];
    height?: number;
    initialWidth?: number;
    minBarLength?: number;
    stackGap?: number;
    xDataKey?: string;
    yDomain?: readonly [number, number];
}

const Bar = definePart<BarChartBarProps>("BarChart.Bar");
const Grid = definePart<ChartGridProps>("BarChart.Grid");
const Legend = definePart<BarChartLegendProps>("BarChart.Legend");
const ReferenceLine = definePart<ChartReferenceLineProps>("BarChart.ReferenceLine");
const Tooltip = definePart<ChartTooltipProps>("BarChart.Tooltip");
const Track = definePart<BarChartTrackProps>("BarChart.Track");
const XAxis = definePart<ChartXAxisProps>("BarChart.XAxis");
const YAxis = definePart<ChartYAxisProps>("BarChart.YAxis");

const HEADROOM = 1.05;
const MARGIN_TOP = 6;
const MARGIN_BOTTOM = 20;

function BarChartRoot({
    ariaDescription,
    ariaLabel,
    aspectRatio = 2,
    barGap = 0.2,
    barWidth,
    children,
    className,
    columnOpacity,
    compact = false,
    cornerRadius = 0,
    data,
    height,
    initialWidth = 640,
    minBarLength = 1,
    stackGap = 2,
    xDataKey = "name",
    yDomain,
}: BarChartProps) {
    const bars = partsOf(children, Bar);
    const [grid] = partsOf(children, Grid);
    const [legend] = partsOf(children, Legend);
    const [tip] = partsOf(children, Tooltip);
    const [track] = partsOf(children, Track);
    const [xAxis] = partsOf(children, XAxis);
    const [yAxis] = partsOf(children, YAxis);
    const formatValue = tip?.formatValue ?? String;
    const formatX: FormatX = tip?.formatX ?? ((datum) => labelAt(datum, xDataKey));
    const seriesLabel = ({ dataKey, label }: BarChartBarProps) => legend?.labels?.[dataKey] ?? label ?? dataKey;

    const stacks = stackBands(bars, data.length, (bar, index) => numberAt(data[index] ?? {}, bar.dataKey));
    const totals = data.map((_, index) => stacks.at(-1)?.[index]?.y2 ?? 0);
    const segments = stacks.flat().filter((band) => band.value > 0);
    const domain = yDomain ?? ([0, Math.max(1, ...totals) * HEADROOM] as const);
    const opacityOf = (index: number) => columnOpacity?.(data[index] ?? {}, index) ?? 1;
    const opacities = [...new Set(data.map((_, index) => opacityOf(index)))];
    const empties = data.flatMap((_, index) => ((totals[index] ?? 0) > 0 ? [] : [{ index }]));

    const definition = defineChart(
        ({ height: surfaceHeight }) => {
            const margin = compact ? { bottom: 0, top: 0 } : { bottom: MARGIN_BOTTOM, top: MARGIN_TOP };
            const unitsPerPixel = (domain[1] - domain[0]) / Math.max(1, surfaceHeight - margin.top - margin.bottom);
            const halfGap = (stackGap / 2) * unitsPerPixel;
            const painted = segments.map((band) => {
                const isBase = band.y1 <= 0;
                const isTop = band.y2 >= (totals[band.index] ?? 0);
                const y1 = isBase ? band.y1 : band.y1 + halfGap;
                const y2 = isTop ? band.y2 : band.y2 - halfGap;
                return {
                    color: band.series.color,
                    index: band.index,
                    isTop,
                    key: band.series.dataKey,
                    label: seriesLabel(band.series),
                    row: data[band.index] ?? {},
                    value: band.value,
                    y1,
                    y2: Math.max(y2, y1 + minBarLength * unitsPerPixel),
                };
            });
            return {
                guides: !compact,
                margin: compact ? 0 : margin,
                marks: [
                    crosshair({
                        x: { band: { fill: "var(--color-foreground)", fillOpacity: 0.06 } },
                        y: false,
                    }),
                    ...(track
                        ? [
                              decorative(
                                  barY(empties, {
                                      fill: track.color ?? "var(--color-border)",
                                      id: "track",
                                      maxThickness: barWidth,
                                      radius: cornerRadius ? [cornerRadius, cornerRadius, 0, 0] : undefined,
                                      x: "index",
                                      y1: () => domain[0],
                                      y2: () => domain[0] + (track.length ?? 3) * unitsPerPixel,
                                  })
                              ),
                          ]
                        : []),
                    ...opacities.map((opacity) =>
                        barY(
                            painted.filter((segment) => opacityOf(segment.index) === opacity),
                            {
                                fill: (segment) => segment.color,
                                fillOpacity: opacity,
                                id: `bars-${opacity}`,
                                key: (segment) => `${segment.index}:${segment.key}`,
                                maxThickness: barWidth,
                                radius: (segment) =>
                                    segment.isTop && cornerRadius ? [cornerRadius, cornerRadius, 0, 0] : 0,
                                x: "index",
                                y1: "y1",
                                y2: "y2",
                                z: "key",
                            }
                        )
                    ),
                    ...referenceLineMarks(partsOf(children, ReferenceLine)),
                ],
                scales: {
                    x: {
                        axis: compact ? false : xAxisOf(data, xDataKey, xAxis),
                        scale: scaleBand<number>()
                            .domain(data.map((_, index) => index))
                            .padding(barGap),
                    },
                    y: { ...yGuidesOf(grid, yAxis), scale: scaleLinear().domain(domain) },
                },
            };
        },
        {
            focus: "group-x",
            focusRing: false,
            maxFocusDistance: Number.POSITIVE_INFINITY,
            theme: CHART_THEME,
            tooltip: {
                content: (points, { primaryPoint }) => ({
                    rows: points.map((point) => ({
                        active: point === primaryPoint,
                        color: point.datum.color,
                        label: point.datum.label,
                        value: formatValue(point.datum.value, point.datum.key),
                    })),
                    title: points[0] ? formatX(points[0].datum.row, points[0].datum.index) : undefined,
                }),
                use: tooltip,
            },
        }
    );

    return (
        <figure className={`relative m-0 ${className ?? ""}`}>
            <Chart
                ariaDescription={ariaDescription}
                ariaLabel={ariaLabel}
                aspectRatio={height ? undefined : aspectRatio}
                className={CHART_HOST_CLASS}
                definition={definition}
                height={height}
                initialWidth={initialWidth}
            />
            {legend ? (
                <ChartLegend
                    className={legend.className}
                    items={bars.map((bar) => ({ color: bar.color, key: bar.dataKey, label: seriesLabel(bar) }))}
                />
            ) : null}
            <ChartDataTable
                caption={ariaLabel}
                columns={bars.toReversed().map((bar) => ({
                    key: bar.dataKey,
                    label: seriesLabel(bar),
                    value: (row) => numberAt(row, bar.dataKey),
                }))}
                formatValue={formatValue}
                formatX={formatX}
                rows={data}
            />
        </figure>
    );
}

export const BarChart = Object.assign(BarChartRoot, {
    Bar,
    Grid,
    Legend,
    ReferenceLine,
    Tooltip,
    Track,
    XAxis,
    YAxis,
});

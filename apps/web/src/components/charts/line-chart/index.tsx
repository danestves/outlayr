import { defineChart, dot, lineY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { decorative } from "@tanstack/charts/mark/decorative";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { ReactNode } from "react";

import {
    CHART_HOST_CLASS,
    CHART_THEME,
    CROSSHAIR_STROKE,
    ChartDataTable,
    ChartLegend,
    curveOf,
    definePart,
    labelAt,
    numberAt,
    partsOf,
    xAxisOf,
    yGuidesOf,
} from "../shared";
import type {
    ChartCurveName,
    ChartDatum,
    ChartGridProps,
    ChartTooltipProps,
    ChartXAxisProps,
    ChartYAxisProps,
    FormatX,
} from "../shared";

export interface LineChartLineProps {
    color?: string;
    colorIndex?: 1 | 2 | 3 | 4 | 5;
    dashArray?: string;
    dataKey: string;
    endMarker?: boolean;
    label?: string;
    showMarkers?: boolean;
    strokeWidth?: number;
}

export interface LineChartLegendProps {
    className?: string;
    labels?: Readonly<Record<string, string>>;
}

export interface LineChartProps {
    ariaDescription?: string;
    ariaLabel: string;
    aspectRatio?: number;
    children: ReactNode;
    className?: string;
    compact?: boolean;
    curve?: ChartCurveName;
    data: readonly ChartDatum[];
    height?: number;
    initialWidth?: number;
    surfaceColor?: string;
    xDataKey?: string;
    yDomain?: readonly [number, number];
}

const Grid = definePart<ChartGridProps>("LineChart.Grid");
const Legend = definePart<LineChartLegendProps>("LineChart.Legend");
const Line = definePart<LineChartLineProps>("LineChart.Line");
const Tooltip = definePart<ChartTooltipProps>("LineChart.Tooltip");
const XAxis = definePart<ChartXAxisProps>("LineChart.XAxis");
const YAxis = definePart<ChartYAxisProps>("LineChart.YAxis");

const DOMAIN_PADDING = 0.08;
const END_MARKER_RADIUS = 4;

const seriesColor = ({ color, colorIndex }: LineChartLineProps) =>
    color ?? (colorIndex ? `var(--color-chart-${colorIndex}, var(--color-foreground))` : "var(--color-foreground)");

function LineChartRoot({
    ariaDescription,
    ariaLabel,
    aspectRatio = 2,
    children,
    className,
    compact = false,
    curve = "linear",
    data,
    height,
    initialWidth = 640,
    surfaceColor = "var(--color-background)",
    xDataKey = "date",
    yDomain,
}: LineChartProps) {
    const lines = partsOf(children, Line);
    const [grid] = partsOf(children, Grid);
    const [legend] = partsOf(children, Legend);
    const [tip] = partsOf(children, Tooltip);
    const [xAxis] = partsOf(children, XAxis);
    const [yAxis] = partsOf(children, YAxis);
    const formatValue = tip?.formatValue ?? String;
    const formatX: FormatX = tip?.formatX ?? ((datum) => labelAt(datum, xDataKey));

    const seriesRows = lines.map((line) =>
        data.map((row, index) => ({
            color: seriesColor(line),
            index,
            key: line.dataKey,
            label: legend?.labels?.[line.dataKey] ?? line.label ?? line.dataKey,
            row,
            value: numberAt(row, line.dataKey),
        }))
    );
    const values = seriesRows.flat().map((row) => row.value);
    const low = Math.min(...values, Number.POSITIVE_INFINITY);
    const high = Math.max(...values, Number.NEGATIVE_INFINITY);
    const padding = (high - low || Math.abs(high) || 1) * DOMAIN_PADDING;
    const domain = yDomain ?? (values.length > 0 ? ([low - padding, high + padding] as const) : ([0, 1] as const));

    const definition = defineChart({
        focus: "group-x",
        focusRing: { radius: END_MARKER_RADIUS, strokeWidth: 2 },
        guides: !compact,
        margin: compact ? 0 : undefined,
        marks: [
            ...seriesRows.map((rows, index) =>
                lineY(rows, {
                    curve: curveOf(curve),
                    id: `line-${lines[index]?.dataKey}`,
                    key: "index",
                    points: lines[index]?.showMarkers,
                    stroke: rows[0]?.color,
                    strokeDasharray: lines[index]?.dashArray,
                    strokeWidth: lines[index]?.strokeWidth ?? 2,
                    x: "index",
                    y: "value",
                    z: "key",
                })
            ),
            ...seriesRows.flatMap((rows, index) =>
                lines[index]?.endMarker
                    ? [
                          decorative(
                              dot(rows.slice(-1), {
                                  fill: rows[0]?.color,
                                  id: `end-${lines[index]?.dataKey}`,
                                  r: END_MARKER_RADIUS,
                                  stroke: surfaceColor,
                                  strokeWidth: 2,
                                  x: "index",
                                  y: "value",
                              })
                          ),
                      ]
                    : []
            ),
            crosshair({ stroke: CROSSHAIR_STROKE, strokeWidth: 1, x: true, y: false }),
        ],
        maxFocusDistance: Number.POSITIVE_INFINITY,
        scales: {
            x: {
                axis: compact ? false : xAxisOf(data, xDataKey, xAxis),
                scale: scaleLinear().domain([0, Math.max(data.length - 1, 1)]),
            },
            y: { ...yGuidesOf(grid, yAxis), scale: scaleLinear().domain(domain) },
        },
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
    });

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
                    className={`mt-2 ${legend.className ?? ""}`}
                    items={lines.map((line) => ({
                        color: seriesColor(line),
                        key: line.dataKey,
                        label: legend.labels?.[line.dataKey] ?? line.label ?? line.dataKey,
                    }))}
                />
            ) : null}
            <ChartDataTable
                caption={ariaLabel}
                columns={lines.map(({ dataKey, label }) => ({
                    key: dataKey,
                    label: legend?.labels?.[dataKey] ?? label ?? dataKey,
                    value: (row) => numberAt(row, dataKey),
                }))}
                formatValue={formatValue}
                formatX={formatX}
                rows={data}
            />
        </figure>
    );
}

export const LineChart = Object.assign(LineChartRoot, { Grid, Legend, Line, Tooltip, XAxis, YAxis });

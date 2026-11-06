import { areaY, defineChart, lineY } from "@tanstack/charts";
import { crosshair } from "@tanstack/charts/crosshair";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { ReactNode } from "react";

import {
    CHART_HOST_CLASS,
    CHART_THEME,
    CROSSHAIR_STROKE,
    ChartDataTable,
    curveOf,
    definePart,
    labelAt,
    markerMarks,
    numberAt,
    partsOf,
    referenceLineMarks,
    xAxisOf,
    yGuidesOf,
} from "../shared";
import type {
    ChartCurveName,
    ChartDatum,
    ChartGridProps,
    ChartMarkerProps,
    ChartReferenceLineProps,
    ChartTooltipProps,
    ChartXAxisProps,
    ChartYAxisProps,
    FormatValue,
    FormatX,
} from "../shared";
import { placeLabels, stackBands } from "../shared/layout";

export interface AreaChartAreaProps {
    color: string;
    dataKey: string;
    label?: string;
    opacity?: number;
}

export interface AreaChartLineProps {
    color?: string;
    curve?: ChartCurveName;
    dashArray?: string;
    dataKey: string;
    label?: string;
    strokeWidth?: number;
}

export interface AreaChartExtraLabel {
    at: number;
    id: string;
    label: string;
    value: number;
}

export interface AreaChartLabelsProps {
    extra?: readonly AreaChartExtraLabel[];
    formatValue?: FormatValue;
    minGap?: number;
}

export interface AreaChartProps {
    ariaDescription?: string;
    ariaLabel: string;
    children: ReactNode;
    className?: string;
    data: readonly ChartDatum[];
    height?: number;
    initialWidth?: number;
    surfaceColor?: string;
    xDataKey?: string;
    yDomain?: readonly [number, number];
}

const Area = definePart<AreaChartAreaProps>("AreaChart.Area");
const Grid = definePart<ChartGridProps>("AreaChart.Grid");
const Labels = definePart<AreaChartLabelsProps>("AreaChart.Labels");
const Line = definePart<AreaChartLineProps>("AreaChart.Line");
const Marker = definePart<ChartMarkerProps>("AreaChart.Marker");
const ReferenceLine = definePart<ChartReferenceLineProps>("AreaChart.ReferenceLine");
const Tooltip = definePart<ChartTooltipProps>("AreaChart.Tooltip");
const XAxis = definePart<ChartXAxisProps>("AreaChart.XAxis");
const YAxis = definePart<ChartYAxisProps>("AreaChart.YAxis");

const MARGIN_TOP = 8;
const MARGIN_BOTTOM = 24;
const LABEL_GAP = 16;
const HEADROOM = 1.03;
const DIM_LABEL_OPACITY = 0.45;
const GAP_STROKE = 1.5;

function AreaChartRoot({
    ariaDescription,
    ariaLabel,
    children,
    className,
    data,
    height = 328,
    initialWidth = 640,
    surfaceColor = "var(--color-background)",
    xDataKey = "date",
    yDomain,
}: AreaChartProps) {
    const areas = partsOf(children, Area);
    const lines = partsOf(children, Line);
    const [grid] = partsOf(children, Grid);
    const [labels] = partsOf(children, Labels);
    const [tip] = partsOf(children, Tooltip);
    const [xAxis] = partsOf(children, XAxis);
    const [yAxis] = partsOf(children, YAxis);
    const formatValue = tip?.formatValue ?? labels?.formatValue ?? String;
    const formatLabel = labels?.formatValue ?? formatValue;
    const formatX: FormatX = tip?.formatX ?? ((datum) => labelAt(datum, xDataKey));

    const bands = stackBands(areas, data.length, (area, index) => numberAt(data[index] ?? {}, area.dataKey)).map(
        (column) =>
            column.map((band) => ({
                color: band.series.color,
                index: band.index,
                key: band.series.dataKey,
                label: band.series.label ?? band.series.dataKey,
                row: data[band.index] ?? {},
                value: band.value,
                y1: band.y1,
                y2: band.y2,
            }))
    );
    const lineRows = lines.map((line) =>
        data.map((row, index) => ({
            color: line.color ?? "var(--color-foreground)",
            index,
            key: line.dataKey,
            label: line.label ?? line.dataKey,
            row,
            value: numberAt(row, line.dataKey),
        }))
    );

    const peak = Math.max(
        1,
        ...(bands.at(-1)?.map((band) => band.y2) ?? []),
        ...lineRows.flat().map((row) => row.value)
    );
    const domain = yDomain ?? ([0, peak * HEADROOM] as const);
    const plotHeight = height - MARGIN_TOP - MARGIN_BOTTOM;
    const yPixel = (value: number) =>
        MARGIN_TOP + plotHeight - ((value - domain[0]) / (domain[1] - domain[0])) * plotHeight;

    const definition = defineChart({
        focus: "group-x",
        focusRing: false,
        margin: { bottom: MARGIN_BOTTOM, right: 0, top: MARGIN_TOP },
        marks: [
            ...bands.map((column, index) =>
                areaY(column, {
                    fill: (band) => band.color,
                    fillOpacity: areas[index]?.opacity ?? 1,
                    id: `area-${areas[index]?.dataKey}`,
                    key: "index",
                    stroke: surfaceColor,
                    strokeWidth: GAP_STROKE,
                    x: "index",
                    y1: "y1",
                    y2: "y2",
                    z: "key",
                })
            ),
            ...lineRows.map((rows, index) =>
                lineY(rows, {
                    curve: curveOf(lines[index]?.curve),
                    id: `line-${lines[index]?.dataKey}`,
                    key: "index",
                    lineCap: "butt",
                    stroke: lines[index]?.color ?? "var(--color-foreground)",
                    strokeDasharray: lines[index]?.dashArray,
                    strokeWidth: lines[index]?.strokeWidth ?? 2,
                    x: "index",
                    y: "value",
                    z: "key",
                })
            ),
            ...referenceLineMarks(partsOf(children, ReferenceLine)),
            ...markerMarks(partsOf(children, Marker), data.length, domain[1]),
            crosshair({ stroke: CROSSHAIR_STROKE, strokeWidth: 1, x: true, y: false }),
        ],
        maxFocusDistance: Number.POSITIVE_INFINITY,
        scales: {
            x: {
                axis: xAxisOf(data, xDataKey, xAxis),
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

    const labelRows = labels
        ? placeLabels(
              [
                  ...lineRows
                      .flatMap((rows) => rows.slice(-1))
                      .map((last) => ({
                          color: last.color,
                          key: last.key,
                          kind: "line",
                          label: last.label,
                          opacity: 1,
                          value: last.value,
                          y: yPixel(last.value),
                      })),
                  ...bands.flatMap((column, index) =>
                      column.slice(-1).map((last) => ({
                          color: last.color,
                          key: last.key,
                          kind: "area",
                          label: last.label,
                          opacity: (areas[index]?.opacity ?? 1) < 1 ? DIM_LABEL_OPACITY : 1,
                          value: last.value,
                          y: yPixel((last.y1 + last.y2) / 2),
                      }))
                  ),
                  ...(labels.extra ?? []).map((extra) => ({
                      color: "transparent",
                      key: extra.id,
                      kind: "extra",
                      label: extra.label,
                      opacity: 1,
                      value: extra.value,
                      y: yPixel(extra.at),
                  })),
              ],
              { gap: labels.minGap ?? LABEL_GAP, max: height - MARGIN_BOTTOM, min: MARGIN_TOP }
          )
        : [];

    return (
        <figure className={`@container relative m-0 ${className ?? ""}`}>
            <div className={labels ? "@lg:mr-40" : undefined}>
                <Chart
                    ariaDescription={ariaDescription}
                    ariaLabel={ariaLabel}
                    className={CHART_HOST_CLASS}
                    definition={definition}
                    height={height}
                    initialWidth={initialWidth}
                />
            </div>
            {labels ? (
                <ol className="m-0 mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs leading-[15px] @lg:absolute @lg:inset-y-0 @lg:right-0 @lg:mt-0 @lg:block @lg:w-[146px]">
                    {labelRows.map((row) => (
                        <li
                            className="flex items-center gap-1.5 whitespace-nowrap @lg:absolute @lg:inset-x-0 @lg:-translate-y-1/2"
                            key={row.key}
                            style={{ opacity: row.opacity, top: row.y }}
                        >
                            <span
                                aria-hidden
                                className={`w-2 flex-none ${row.kind === "line" ? "h-0.5" : "h-2 rounded-[2px]"}`}
                                style={{ backgroundColor: row.color }}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                            <span className="text-muted-foreground font-mono">{formatLabel(row.value, row.key)}</span>
                        </li>
                    ))}
                </ol>
            ) : null}
            <ChartDataTable
                caption={ariaLabel}
                columns={[...lines, ...areas.toReversed()].map(({ dataKey, label }) => ({
                    key: dataKey,
                    label: label ?? dataKey,
                    value: (row) => numberAt(row, dataKey),
                }))}
                formatValue={formatValue}
                formatX={formatX}
                rows={data}
            />
        </figure>
    );
}

export const AreaChart = Object.assign(AreaChartRoot, {
    Area,
    Grid,
    Labels,
    Line,
    Marker,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
});

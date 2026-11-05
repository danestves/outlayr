import { createMark, ruleX, ruleY, text } from "@tanstack/charts";
import { decorative } from "@tanstack/charts/mark/decorative";
import { isValidElement } from "react";
import type { ReactNode } from "react";

export type ChartDatum = Readonly<Record<string, string | number | null | undefined>>;
export type ChartCurveName = "linear" | "step";
export type FormatValue = (value: number, key: string) => string;
export type FormatX = (datum: ChartDatum, index: number) => string;

export interface ChartGridProps {
    color?: string;
    dashArray?: string;
    opacity?: number;
    rows?: number;
}

export interface ChartXAxisProps {
    format?: FormatX;
    highlight?: (datum: ChartDatum, index: number) => boolean;
    tickValues?: readonly number[];
    ticks?: number;
}

export interface ChartYAxisProps {
    format?: (value: number) => string;
    tickValues?: readonly number[];
    ticks?: number;
}

export interface ChartTooltipProps {
    formatValue?: FormatValue;
    formatX?: FormatX;
}

export interface ChartReferenceLineProps {
    color?: string;
    dashArray?: string;
    label?: string;
    y: number;
}

export interface ChartMarkerProps {
    color?: string;
    dashArray?: string;
    index: number;
    label?: string;
}

export interface ChartTableColumn {
    key: string;
    label: string;
    value: (datum: ChartDatum) => number;
}

export interface PixelLabel {
    anchor?: "start" | "middle" | "end";
    className?: string;
    fill: string;
    fontSize: number;
    fontWeight?: number;
    key: string;
    text: string;
    x: number;
    y: number;
}

const AXIS_OPACITY = 0.5;
const AXIS_FONT_SIZE = 11;
const ANNOTATION_FONT_SIZE = 11;
const DEFAULT_Y_TICKS = 4;

export const CHART_THEME = {
    background: "transparent",
    foreground: "var(--color-foreground)",
    grid: "var(--color-border)",
    muted: "var(--color-foreground)",
};

export const CHART_HOST_CLASS =
    "tabular-nums [--ts-chart-focus-fill:var(--color-background)] [--ts-chart-tooltip-background:var(--color-popover)] [--ts-chart-tooltip-border-radius:8px] [--ts-chart-tooltip-border:1px_solid_var(--color-border)] [--ts-chart-tooltip-color:var(--color-popover-foreground)] [--ts-chart-tooltip-padding:8px_10px] [--ts-chart-tooltip-shadow:none]";

export const CROSSHAIR_STROKE = "var(--color-muted-foreground)";

export function definePart<Props>(displayName: string) {
    const Part = (_props: Props): ReactNode => null;
    Part.displayName = displayName;
    return Part;
}

export function partsOf<Props>(children: ReactNode, part: (props: Props) => ReactNode): Props[] {
    if (Array.isArray(children)) {
        return children.flatMap((child: ReactNode) => partsOf(child, part));
    }
    return isValidElement<Props>(children) && children.type === part ? [children.props] : [];
}

export function numberAt(datum: ChartDatum, key: string): number {
    const value = datum[key];
    return Number.isFinite(value) ? Number(value) : 0;
}

export function labelAt(datum: ChartDatum, key: string): string {
    const value = datum[key];
    return value === null || value === undefined ? "" : String(value);
}

function tickIndexes(count: number, ticks = count): readonly number[] {
    const wanted = Math.min(ticks, count);
    if (wanted <= 1) {
        return count > 0 ? [0] : [];
    }
    return Array.from({ length: wanted }, (_, index) => Math.round((index * (count - 1)) / (wanted - 1)));
}

export function xAxisOf(
    data: readonly ChartDatum[],
    xDataKey: string,
    axis: ChartXAxisProps | undefined,
    outerAnchors = true
) {
    if (!axis) {
        return false;
    }
    const indexes = axis.tickValues ?? tickIndexes(data.length, axis.ticks);
    const [first] = indexes;
    const last = indexes.at(-1);
    const rowAt = (index: number) => data[index] ?? {};
    return {
        line: false,
        tickLabels: {
            anchor: ({ value }: { value: number }) => {
                if (!outerAnchors) {
                    return "middle" as const;
                }
                if (value === first) {
                    return "start" as const;
                }
                return value === last ? ("end" as const) : ("middle" as const);
            },
            fontSize: AXIS_FONT_SIZE,
            opacity: ({ value }: { value: number }) => (axis.highlight?.(rowAt(value), value) ? 1 : AXIS_OPACITY),
        },
        ticks: {
            format: (value: number) => axis.format?.(rowAt(value), value) ?? labelAt(rowAt(value), xDataKey),
            size: 0,
            values: indexes,
        },
    };
}

export function yGuidesOf(grid: ChartGridProps | undefined, axis: ChartYAxisProps | undefined) {
    const candidates = axis?.tickValues
        ? { values: axis.tickValues }
        : { count: axis?.ticks ?? grid?.rows ?? DEFAULT_Y_TICKS };
    return {
        axis: {
            line: false,
            tickLabels: axis ? { fontSize: AXIS_FONT_SIZE, opacity: AXIS_OPACITY } : false,
            ticks: { ...candidates, format: axis?.format, size: 0 },
        },
        grid: grid
            ? {
                  stroke: grid.color,
                  strokeDasharray: grid.dashArray,
                  strokeOpacity: grid.opacity,
              }
            : false,
    } as const;
}

export function pixelLabels(id: string, labels: readonly PixelLabel[]) {
    return createMark<never, never, never>(() => ({
        channels: {},
        id,
        render: () => ({
            nodes: labels.map(({ fill, ...label }) => ({
                ...label,
                baseline: "middle" as const,
                kind: "label" as const,
                style: { fill },
            })),
        }),
    }));
}

type Pixel = readonly [number, number];

function stepLine(points: readonly Pixel[]) {
    const [start, ...rest] = points;
    if (!start) {
        return "";
    }
    return rest.reduce((path, [x, y]) => `${path}H${x}V${y}`, `M${start[0]} ${start[1]}`);
}

function stepBack(points: readonly Pixel[]) {
    return points.reduce((path, [x, y], index) => (index === 0 ? path : `${path}V${y}H${x}`), "");
}

const STEP_CURVE = {
    area: (top: readonly Pixel[], bottom: readonly Pixel[]) => {
        const tail = bottom.at(-1);
        return tail ? `${stepLine(top)}L${tail[0]} ${tail[1]}${stepBack(bottom.toReversed())}Z` : "";
    },
    line: stepLine,
};

export const curveOf = (name: ChartCurveName | undefined) => (name === "step" ? STEP_CURVE : undefined);

export function referenceLineMarks(lines: readonly ChartReferenceLineProps[]) {
    return lines.flatMap((line, index) => [
        decorative(
            ruleY([line.y], {
                id: `reference-${index}`,
                stroke: line.color ?? "var(--color-foreground)",
                strokeDasharray: line.dashArray ?? "3 4",
                strokeWidth: 1,
            })
        ),
        ...(line.label
            ? [
                  decorative(
                      text([line], {
                          anchor: "start",
                          dx: 8,
                          dy: -8,
                          fill: line.color ?? "var(--color-foreground)",
                          fontSize: ANNOTATION_FONT_SIZE,
                          id: `reference-label-${index}`,
                          text: "label",
                          x: () => 0,
                          y: "y",
                      })
                  ),
              ]
            : []),
    ]);
}

export function markerMarks(markers: readonly ChartMarkerProps[], rowCount: number, top: number) {
    return markers.flatMap((marker, index) => {
        const nearEnd = marker.index > (rowCount - 1) * 0.75;
        const color = marker.color ?? "var(--color-muted-foreground)";
        return [
            decorative(
                ruleX([marker.index], {
                    id: `marker-${index}`,
                    stroke: color,
                    strokeDasharray: marker.dashArray ?? "2 3",
                    strokeWidth: 1,
                })
            ),
            ...(marker.label
                ? [
                      decorative(
                          text([marker], {
                              anchor: nearEnd ? "end" : "start",
                              dx: nearEnd ? -6 : 6,
                              dy: 6,
                              fill: color,
                              fontSize: ANNOTATION_FONT_SIZE,
                              id: `marker-label-${index}`,
                              text: "label",
                              x: "index",
                              y: () => top,
                          })
                      ),
                  ]
                : []),
        ];
    });
}

export function ChartLegend({
    className,
    items,
}: {
    className?: string;
    items: readonly { color: string; key: string; label: string }[];
}) {
    return (
        <ul
            className={`m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] leading-[14px] ${className ?? ""}`}
        >
            {items.map((item) => (
                <li className="text-muted-foreground flex items-center gap-1 whitespace-nowrap" key={item.key}>
                    <span
                        aria-hidden
                        className="inline-block size-2 flex-none rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

export function ChartDataTable({
    caption,
    columns,
    formatValue,
    formatX,
    rows,
}: {
    caption: string;
    columns: readonly ChartTableColumn[];
    formatValue: FormatValue;
    formatX: FormatX;
    rows: readonly ChartDatum[];
}) {
    return (
        <table className="sr-only">
            <caption>{caption}</caption>
            <thead>
                <tr>
                    <td aria-label={caption} />
                    {columns.map((column) => (
                        <th key={column.key} scope="col">
                            {column.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => {
                    const heading = formatX(row, index);
                    return (
                        <tr key={`${heading}-${index}`}>
                            <th scope="row">{heading}</th>
                            {columns.map((column) => (
                                <td key={column.key}>{formatValue(column.value(row), column.key)}</td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

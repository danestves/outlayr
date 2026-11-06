import { defineChart, rect } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { ReactNode } from "react";

import { CHART_HOST_CLASS, CHART_THEME, ChartLegend, definePart, partsOf, pixelLabels } from "../shared";
import type { PixelLabel } from "../shared";
import { fitTileLabel, labelInk, squarifyLayout } from "./squarify";

export interface TreemapDatum {
    color: string;
    id?: string;
    label: string;
    value: number;
}

export interface TreemapChartLabelsProps {
    formatValue?: (value: number, tile: TreemapDatum) => string;
    showValue?: boolean;
}

export interface TreemapChartLegendProps {
    className?: string;
    limit?: number;
}

export interface TreemapChartTooltipProps {
    formatValue?: (value: number, tile: TreemapDatum) => string;
}

export interface TreemapChartProps {
    ariaDescription?: string;
    ariaLabel: string;
    children: ReactNode;
    className?: string;
    cornerRadius?: number;
    data: readonly TreemapDatum[];
    gap?: number;
    height?: number;
    initialWidth?: number;
    onSelect?: (tile: TreemapDatum) => void;
    sort?: boolean;
}

const Labels = definePart<TreemapChartLabelsProps>("TreemapChart.Labels");
const Legend = definePart<TreemapChartLegendProps>("TreemapChart.Legend");
const Tiles = definePart<object>("TreemapChart.Tiles");
const Tooltip = definePart<TreemapChartTooltipProps>("TreemapChart.Tooltip");

const TILE_ASPECT = 2.6;
const INK_DARK = "#131209";
const INK_LIGHT = "#fafaf9";
const PADDING_X = 8;
const PADDING_Y = 6;
const NAME_SIZE = 12;
const VALUE_SIZE = 11;
const LINE = 15;
const HALF_LINE = LINE / 2;

function tileLabels(
    tile: TreemapDatum,
    box: { x0: number; x1: number; y0: number; y1: number },
    key: string,
    value: string | null
): PixelLabel[] {
    const fit = fitTileLabel(
        { height: box.y1 - box.y0, width: box.x1 - box.x0, x: box.x0, y: box.y0 },
        tile.label,
        value
    );
    if (fit === "none") {
        return [];
    }
    const fill = labelInk(tile.color, INK_DARK, INK_LIGHT, "var(--color-foreground)");
    const nameBase = { anchor: "start" as const, fill, key: `${key}:name`, text: tile.label, x: box.x0 + PADDING_X };
    const name = { ...nameBase, fontSize: NAME_SIZE, fontWeight: 600 };
    const valueBase = { className: "font-mono", fill, fontSize: VALUE_SIZE, fontWeight: 500, key: `${key}:value` };
    const bottom = box.y1 - PADDING_Y;
    if (fit === "stacked") {
        return [
            { ...name, y: bottom - LINE - HALF_LINE },
            { ...valueBase, anchor: "start", text: value ?? "", x: box.x0 + PADDING_X, y: bottom - HALF_LINE },
        ];
    }
    const middle = (box.y0 + box.y1) / 2;
    if (fit === "name") {
        return [{ ...name, y: bottom - HALF_LINE }];
    }
    return [
        { ...name, y: middle },
        { ...valueBase, anchor: "end", text: value ?? "", x: box.x1 - PADDING_X, y: middle },
    ];
}

function TreemapChartRoot({
    ariaDescription,
    ariaLabel,
    children,
    className,
    cornerRadius = 5,
    data,
    gap = 2,
    height = 178,
    initialWidth = 472,
    onSelect,
    sort = true,
}: TreemapChartProps) {
    const hasTiles = partsOf(children, Tiles).length > 0;
    const [labels] = partsOf(children, Labels);
    const [legend] = partsOf(children, Legend);
    const [tip] = partsOf(children, Tooltip);
    const tiles = sort ? data.toSorted((a, b) => b.value - a.value) : data;
    const total = tiles.reduce((sum, tile) => sum + Math.max(tile.value, 0), 0);
    const formatValue = tip?.formatValue ?? labels?.formatValue ?? String;
    const formatLabel = labels?.formatValue ?? formatValue;

    const definition = defineChart(
        ({ height: surfaceHeight, width }) => {
            const rects = squarifyLayout(
                tiles.map((tile) => tile.value),
                width,
                surfaceHeight,
                TILE_ASPECT
            );
            const boxes = tiles.flatMap((tile, index) => {
                const box = rects[index];
                return box && box.width > 0 && box.height > 0
                    ? [
                          {
                              key: tile.id ?? tile.label,
                              tile,
                              x0: box.x,
                              x1: box.x + box.width,
                              y0: box.y,
                              y1: box.y + box.height,
                          },
                      ]
                    : [];
            });
            return {
                guides: false,
                margin: 0,
                marks: [
                    ...(hasTiles
                        ? boxes.map((box) =>
                              rect([box], {
                                  fill: box.tile.color,
                                  id: `tile-${box.key}`,
                                  inset: gap / 2,
                                  key: "key",
                                  radius: cornerRadius,
                                  x1: "x0",
                                  x2: "x1",
                                  y1: "y0",
                                  y2: "y1",
                              })
                          )
                        : []),
                    ...(labels
                        ? [
                              pixelLabels(
                                  "tile-labels",
                                  boxes.flatMap((box) =>
                                      tileLabels(
                                          box.tile,
                                          {
                                              x0: box.x0 + gap / 2,
                                              x1: box.x1 - gap / 2,
                                              y0: box.y0 + gap / 2,
                                              y1: box.y1 - gap / 2,
                                          },
                                          box.key,
                                          labels.showValue === false ? null : formatLabel(box.tile.value, box.tile)
                                      )
                                  )
                              ),
                          ]
                        : []),
                ],
                scales: {
                    x: { scale: scaleLinear().domain([0, width]) },
                    y: { scale: scaleLinear().domain([surfaceHeight, 0]) },
                },
            };
        },
        {
            focusRing: false,
            theme: CHART_THEME,
            tooltip: {
                content: ([point]) => ({
                    rows: point
                        ? [
                              {
                                  color: point.datum.tile.color,
                                  label: point.datum.tile.label,
                                  value: formatValue(point.datum.tile.value, point.datum.tile),
                              },
                          ]
                        : [],
                }),
                use: tooltip,
            },
        }
    );

    return (
        <figure className={`relative m-0 ${onSelect ? "cursor-pointer" : ""} ${className ?? ""}`}>
            <Chart
                ariaDescription={ariaDescription}
                ariaLabel={ariaLabel}
                className={CHART_HOST_CLASS}
                definition={definition}
                height={height}
                initialWidth={initialWidth}
                onSelect={
                    onSelect
                        ? (point) => {
                              if (point) {
                                  onSelect(point.datum.tile);
                              }
                          }
                        : undefined
                }
            />
            {legend ? (
                <ChartLegend
                    className={`mt-2 ${legend.className ?? ""}`}
                    items={tiles.slice(0, legend.limit).map((tile) => ({
                        color: tile.color,
                        key: tile.id ?? tile.label,
                        label: tile.label,
                    }))}
                />
            ) : null}
            <ul className="sr-only">
                {tiles.map((tile) => (
                    <li key={tile.id ?? tile.label}>
                        {tile.label}, {formatValue(tile.value, tile)},{" "}
                        {total > 0 ? `${Math.round((Math.max(tile.value, 0) / total) * 100)}%` : ""}
                    </li>
                ))}
            </ul>
        </figure>
    );
}

export const TreemapChart = Object.assign(TreemapChartRoot, { Labels, Legend, Tiles, Tooltip });

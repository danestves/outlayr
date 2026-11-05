import { createMark, defineChart } from "@tanstack/charts";
import { sankeyDiagram } from "@tanstack/charts/network/sankey";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
import { useRef } from "react";
import type { ReactNode } from "react";

import { CHART_HOST_CLASS, CHART_THEME, definePart, partsOf, pixelLabels } from "../shared";
import { placeLabels } from "../shared/layout";
import { ribbonPath, ribbonPolygon, rowCenter, rowSpans } from "./ribbons";
import type { SankeyRowGrid, Span } from "./ribbons";

export type { SankeyRowGrid } from "./ribbons";

export interface SankeyNode {
    bar?: boolean;
    color?: string;
    id: string;
    label?: string;
}

export interface SankeyLink {
    color?: string;
    opacity?: readonly [number, number];
    source: string;
    target: string;
    value: number;
}

export interface SankeyTargetLayout {
    id: string;
    y: number;
    y0: number;
    y1: number;
}

export interface SankeyChartLinksProps {
    opacity?: readonly [number, number];
}

export interface SankeyChartNodesProps {
    radius?: number;
}

export interface SankeyChartLabelsProps {
    formatValue?: (value: number, node: SankeyNode) => string;
    showValue?: boolean;
    width?: number;
}

export interface SankeyChartTooltipProps {
    formatValue?: (value: number) => string;
}

export interface SankeyChartProps {
    ariaDescription?: string;
    ariaLabel: string;
    children: ReactNode;
    className?: string;
    curve?: number;
    height: number;
    initialWidth?: number;
    iterations?: number;
    links: readonly SankeyLink[];
    nodePadding?: number;
    nodeWidth?: number;
    nodes: readonly SankeyNode[];
    onLayout?: (targets: readonly SankeyTargetLayout[]) => void;
    targetRows?: SankeyRowGrid;
}

const Labels = definePart<SankeyChartLabelsProps>("SankeyChart.Labels");
const Links = definePart<SankeyChartLinksProps>("SankeyChart.Links");
const Nodes = definePart<SankeyChartNodesProps>("SankeyChart.Nodes");
const Tooltip = definePart<SankeyChartTooltipProps>("SankeyChart.Tooltip");

const DEFAULT_OPACITY = [0.4, 1] as const;
const DEFAULT_LABEL_WIDTH = 84;
const LABEL_OFFSET = 8;
const NAME_SIZE = 12;
const VALUE_SIZE = 11;
const LINE = 15;

interface RibbonDatum {
    color: string;
    id: string;
    source: string;
    target: string;
    value: number;
}

function ribbons(
    id: string,
    rows: readonly {
        datum: RibbonDatum;
        fill: string;
        left: Span;
        right: Span;
        x1: number;
        x2: number;
    }[],
    curve: number
) {
    return createMark<RibbonDatum, string, number>(() => ({
        channels: {},
        id,
        render: () => {
            const points = rows.map((row, index) => ({
                color: row.datum.color,
                datum: row.datum,
                datumIndex: index,
                group: row.datum.id,
                groupLabel: row.datum.target,
                key: row.datum.id,
                markId: id,
                x: (row.x1 + row.x2) / 2,
                xValue: row.datum.source,
                y: (row.left[0] + row.left[1] + row.right[0] + row.right[1]) / 4,
                yValue: row.datum.value,
            }));
            return {
                nodes: rows.flatMap((row, index) => {
                    const point = points[index];
                    return point
                        ? [
                              {
                                  interaction: { affinity: "geometry" as const, point },
                                  key: row.datum.id,
                                  kind: "area" as const,
                                  path: ribbonPath(row.x1, row.x2, curve, row.left, row.right),
                                  points: ribbonPolygon(row.x1, row.x2, curve, row.left, row.right),
                                  style: { fill: row.fill },
                              },
                          ]
                        : [];
                }),
                points,
            };
        },
    }));
}

const gradientId = (index: number) => `ribbon-${index}`;

function nodeBars(
    rows: readonly { color: string; key: string; x0: number; x1: number; y0: number; y1: number }[],
    radius: number | undefined
) {
    return createMark<never, never, never>(() => ({
        channels: {},
        id: "bars",
        render: () => ({
            nodes: rows.map((row) => ({
                height: row.y1 - row.y0,
                key: row.key,
                kind: "rect" as const,
                radius,
                style: { fill: row.color },
                width: row.x1 - row.x0,
                x: row.x0,
                y: row.y0,
            })),
        }),
    }));
}

function SankeyChartRoot({
    ariaDescription,
    ariaLabel,
    children,
    className,
    curve = 0.5,
    height,
    initialWidth = 640,
    iterations = 6,
    links,
    nodePadding = 8,
    nodeWidth = 2,
    nodes,
    onLayout,
    targetRows,
}: SankeyChartProps) {
    const [linkPart] = partsOf(children, Links);
    const [nodePart] = partsOf(children, Nodes);
    const [labels] = partsOf(children, Labels);
    const [tip] = partsOf(children, Tooltip);
    let laidTargets: readonly SankeyTargetLayout[] = [];
    const reported = useRef("");

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const drawable = links.filter((link) => link.value > 0 && byId.has(link.source) && byId.has(link.target));
    const connected = new Set(drawable.flatMap((link) => [link.source, link.target]));
    const drawnNodes = nodes.filter((node) => connected.has(node.id));
    const hasOutgoing = new Set(drawable.map((link) => link.source));
    const hasIncoming = new Set(drawable.map((link) => link.target));
    const firstColumn = drawnNodes.filter((node) => !hasIncoming.has(node.id));
    const lastColumn = drawnNodes.filter((node) => !hasOutgoing.has(node.id));
    const lastRow = new Map(lastColumn.map((node, index) => [node.id, index]));
    const labelWidth = labels?.width ?? DEFAULT_LABEL_WIDTH;
    const insetLeft = labels && firstColumn.some((node) => node.label) ? labelWidth : 0;
    const insetRight = labels && !targetRows && lastColumn.some((node) => node.label) ? labelWidth : 0;
    const linkColor = (link: SankeyLink) =>
        link.color ?? byId.get(link.source)?.color ?? byId.get(link.target)?.color ?? "var(--color-muted-foreground)";
    const linkOpacity = (link: SankeyLink) => link.opacity ?? linkPart?.opacity ?? DEFAULT_OPACITY;
    const nameOf = (id: string) => byId.get(id)?.label ?? id;
    const formatTip = tip?.formatValue ?? String;
    const formatLabel = labels?.formatValue ?? ((value: number) => formatTip(value));

    const definition = defineChart({
        focusRing: { radius: 4, strokeWidth: 2 },
        gradients: drawable.map((link, index) => {
            const [from, to] = linkOpacity(link);
            return {
                id: gradientId(index),
                stops: [
                    { color: linkColor(link), offset: 0, opacity: from },
                    { color: linkColor(link), offset: 1, opacity: to },
                ],
                x1: 0,
                x2: 1,
                y1: 0,
                y2: 0,
            };
        }),
        guides: false,
        margin: 0,
        marks:
            drawable.length === 0
                ? []
                : [
                      sankeyDiagram({
                          iterations,
                          inset: { left: insetLeft, right: insetRight },
                          linkKey: (link) => `${link.source}->${link.target}`,
                          linkSort: null,
                          links: drawable,
                          marks: ({ chart, links: laidLinks, nodes: laidNodes }) => {
                              const rowLinks = new Map<string, number[]>();
                              for (const [index, link] of laidLinks.entries()) {
                                  rowLinks.set(link.targetKey, [...(rowLinks.get(link.targetKey) ?? []), index]);
                              }
                              const rightSpans = new Map<number, Span>();
                              if (targetRows) {
                                  for (const [target, indexes] of rowLinks) {
                                      const row = lastRow.get(target);
                                      if (row !== undefined) {
                                          const spans = rowSpans(
                                              indexes.map((index) => laidLinks[index]?.width ?? 0),
                                              targetRows,
                                              row
                                          );
                                          for (const [position, index] of indexes.entries()) {
                                              const span = spans[position];
                                              if (span) {
                                                  rightSpans.set(index, span);
                                              }
                                          }
                                      }
                                  }
                              }
                              const ribbonRows = laidLinks.map((link, index) => {
                                  const authored = link.sourceIndexes[0] ?? index;
                                  const source = drawable[authored] ?? link.data;
                                  return {
                                      datum: {
                                          color: linkColor(source),
                                          id: String(link.key),
                                          source: nameOf(link.sourceKey),
                                          target: nameOf(link.targetKey),
                                          value: link.value,
                                      },
                                      fill: `url(#${gradientId(authored)})`,
                                      left: [link.y1 - link.width / 2, link.y1 + link.width / 2] as const,
                                      right:
                                          rightSpans.get(index) ??
                                          ([link.y2 - link.width / 2, link.y2 + link.width / 2] as const),
                                      x1: link.x1,
                                      x2: link.x2,
                                  };
                              });
                              const targets = laidNodes.filter((node) => lastRow.has(node.key));
                              const targetLayout = targets.map((node) => {
                                  const row = lastRow.get(node.key) ?? 0;
                                  const incoming = laidLinks.flatMap((link, index) =>
                                      link.targetKey === node.key ? (rightSpans.get(index) ?? []) : []
                                  );
                                  return targetRows
                                      ? {
                                            id: node.key,
                                            y: rowCenter(targetRows, row),
                                            y0: Math.min(...incoming),
                                            y1: Math.max(...incoming),
                                        }
                                      : { id: node.key, y: node.y, y0: node.y0, y1: node.y1 };
                              });
                              laidTargets = targetLayout;
                              const barNodes = laidNodes
                                  .filter(
                                      (node) =>
                                          byId.get(node.key)?.bar !== false && !(targetRows && lastRow.has(node.key))
                                  )
                                  .map((node) => ({
                                      color: byId.get(node.key)?.color ?? "var(--color-foreground)",
                                      key: node.key,
                                      x0: node.x0,
                                      x1: node.x1,
                                      y0: node.y0,
                                      y1: node.y1,
                                  }));
                              const sideLabels = (column: typeof laidNodes, side: "left" | "right") =>
                                  placeLabels(
                                      column.flatMap((node) => {
                                          const source = byId.get(node.key);
                                          return source?.label ? [{ node, source, y: node.y }] : [];
                                      }),
                                      {
                                          gap: labels?.showValue === false ? LINE : LINE * 2,
                                          max: chart.height - LINE,
                                          min: LINE,
                                      }
                                  ).flatMap(({ node, source, y }) => {
                                      const x = side === "left" ? node.x0 - LABEL_OFFSET : node.x1 + LABEL_OFFSET;
                                      const anchor = side === "left" ? ("end" as const) : ("start" as const);
                                      const hasValue = labels?.showValue !== false;
                                      return [
                                          {
                                              anchor,
                                              fill: "var(--color-foreground)",
                                              fontSize: NAME_SIZE,
                                              fontWeight: 500,
                                              key: `${node.key}:name`,
                                              text: source.label ?? "",
                                              x,
                                              y: hasValue ? y - LINE / 2 : y,
                                          },
                                          ...(hasValue
                                              ? [
                                                    {
                                                        anchor,
                                                        className: "font-mono",
                                                        fill: "var(--color-muted-foreground)",
                                                        fontSize: VALUE_SIZE,
                                                        key: `${node.key}:value`,
                                                        text: formatLabel(node.value, source),
                                                        x,
                                                        y: y + LINE / 2,
                                                    },
                                                ]
                                              : []),
                                      ];
                                  });
                              const firstKeys = new Set(firstColumn.map((node) => node.id));
                              return [
                                  ribbons("ribbons", linkPart ? ribbonRows : [], curve),
                                  ...(nodePart ? [nodeBars(barNodes, nodePart.radius)] : []),
                                  ...(labels
                                      ? [
                                            pixelLabels("labels", [
                                                ...sideLabels(
                                                    laidNodes.filter((node) => firstKeys.has(node.key)),
                                                    "left"
                                                ),
                                                ...(targetRows ? [] : sideLabels(targets, "right")),
                                            ]),
                                        ]
                                      : []),
                              ] as const;
                          },
                          nodeKey: "id",
                          nodePadding,
                          nodeSort: null,
                          nodeWidth,
                          nodes: drawnNodes,
                          source: "source",
                          target: "target",
                          value: "value",
                      }),
                  ],
        scales: { x: null, y: null },
        theme: CHART_THEME,
        tooltip: {
            content: ([point]) => ({
                rows: point
                    ? [
                          {
                              color: point.datum.color,
                              label: point.datum.target,
                              value: formatTip(point.datum.value),
                          },
                      ]
                    : [],
                title: point ? point.datum.source : undefined,
            }),
            use: tooltip,
        },
    });

    return (
        <figure className={`relative m-0 ${className ?? ""}`}>
            <Chart
                ariaDescription={ariaDescription}
                ariaLabel={ariaLabel}
                className={CHART_HOST_CLASS}
                definition={definition}
                height={height}
                initialWidth={initialWidth}
                onRender={() => {
                    const signature = JSON.stringify(laidTargets);
                    if (onLayout && signature !== reported.current) {
                        reported.current = signature;
                        onLayout(laidTargets);
                    }
                }}
            />
            <ul className="sr-only">
                {drawable.map((link) => (
                    <li key={`${link.source}->${link.target}`}>
                        {nameOf(link.source)} → {nameOf(link.target)}, {formatTip(link.value)}
                    </li>
                ))}
            </ul>
        </figure>
    );
}

export const SankeyChart = Object.assign(SankeyChartRoot, { Labels, Links, Nodes, Tooltip });

import { useMemo, useState } from "react";

import { axisOf } from "../overview/model";
import { Swatch } from "../parts";
import { useBox } from "../use-box";
import type { Dimension, Grouping, Report } from "./model";
import type { Reading } from "./reading";

const HEIGHT = 330;
const SMALL_HEIGHT = 240;
const SMALL_WIDTH = 480;
const BASE = 22;
const LEFT = 30;
const TOP = 8;
const LABEL_CLEARANCE = 22;
const BAR_SHARE = 0.66;
const SEGMENT_GAP = 1;
const CORNER = 3;
const MIN_TOTAL_SLOT = 64;
const SMALL_TOTAL_SLOT = 52;
const MIN_LABEL_SLOT = 40;
const UNMEASURED = { height: 0, width: 872 };
const FIGURE = "dash-figure";

export function Legend({ kind, report, words }: { kind: Dimension; report: Report; words: Reading }) {
    if (report.measure === "net" || report.measure === "average") {
        return null;
    }
    return (
        <ul className="text-muted-foreground m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-xs">
            {report.rows.map(({ label }) => (
                <li className="flex items-center gap-1.5" key={label.id}>
                    <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-[2px]"
                        style={{ background: label.color ?? "currentColor" }}
                    />
                    {words.rowName(label, kind)}
                </li>
            ))}
        </ul>
    );
}

interface ChartProps {
    fixedWidth?: number;
    grouping: Grouping;
    kind: Dimension;
    label: string;
    report: Report;
    words: Reading;
}

/** Stacked columns when the measure adds up across rows; a single column per period when it cannot. */
export function Chart({ fixedWidth, grouping, kind, label, report, words }: ChartProps) {
    const [holder, { width: measured }] = useBox(UNMEASURED);
    const width = fixedWidth ?? measured;
    const small = width < SMALL_WIDTH;
    const height = small ? SMALL_HEIGHT : HEIGHT;
    const [hovered, setHovered] = useState<number | null>(null);
    const { columns, measure, rows, totals } = report;
    const stacked = measure !== "net" && measure !== "average";
    const { fmt } = words;
    const show = (value: number) => words.measureValue(measure, value);
    const geometry = useMemo(() => {
        const stacks = stacked
            ? columns.map((_, index) => rows.reduce((all, row) => all + Math.max(row.values[index] ?? 0, 0), 0))
            : [];
        const highest = Math.max(0, ...totals.values, ...stacks);
        const lowest = Math.min(0, ...totals.values);
        const axis = axisOf(highest);
        const plot = height - BASE - TOP;
        const tight = (highest / axis.top) * plot > plot - LABEL_CLEARANCE + TOP;
        const top = tight ? axis.roomy : axis.top;
        const floor = lowest < 0 ? -axisOf(-lowest).top : 0;
        const y = (value: number) => height - BASE - ((value - floor) / (top - floor || 1)) * plot;
        const slot = (width - LEFT) / Math.max(columns.length, 1);
        const ticks = floor < 0 ? [floor, 0, top] : [0, top / 2, top];
        return { floor, slot, ticks, top, y };
    }, [columns, height, rows, stacked, totals.values, width]);
    const { slot, ticks, y } = geometry;
    const bar = slot * BAR_SHARE;
    const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SLOT / slot));
    const hover = hovered === null ? null : columns[hovered];
    return (
        <div className="relative" ref={holder}>
            <svg
                aria-label={label}
                className="block"
                height={height}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
                role="img"
                width={width}
            >
                {ticks.map((value) => (
                    <g key={value}>
                        <path className="stroke-border" d={`M${LEFT} ${y(value)}H${width}`} />
                        <text
                            className={`${FIGURE} fill-muted-foreground`}
                            style={{ fontSize: 11 }}
                            x={0}
                            y={y(value) + 4}
                        >
                            {value === 0 ? "0" : fmt.axis(value)}
                        </text>
                    </g>
                ))}
                {columns.map((column, index) => {
                    const x = LEFT + index * slot + (slot - bar) / 2;
                    const last = index === columns.length - 1;
                    const total = totals.values[index] ?? 0;
                    const peak = stacked
                        ? Math.max(
                              total,
                              rows.reduce((all, row) => all + Math.max(row.values[index] ?? 0, 0), 0)
                          )
                        : total;
                    let carried = 0;
                    return (
                        <g key={column.key} opacity={hovered === null || hovered === index ? 1 : 0.55}>
                            {stacked ? (
                                rows.map(({ label: row, values }) => {
                                    const value = values[index] ?? 0;
                                    const start = carried;
                                    carried += value;
                                    return value <= 0 ? null : (
                                        <rect
                                            fill={row.color ?? "currentColor"}
                                            height={Math.max(y(start) - y(carried) - SEGMENT_GAP * 2, 1)}
                                            key={row.id}
                                            rx={CORNER}
                                            width={bar}
                                            x={x}
                                            y={y(carried) + SEGMENT_GAP}
                                        />
                                    );
                                })
                            ) : (
                                <rect
                                    fill="var(--color-app-tint)"
                                    height={Math.max(Math.abs(y(total) - y(0)), 1)}
                                    rx={CORNER}
                                    width={bar}
                                    x={x}
                                    y={Math.min(y(total), y(0))}
                                />
                            )}
                            {slot >= (small ? SMALL_TOTAL_SLOT : MIN_TOTAL_SLOT) ? (
                                <text
                                    className={`${FIGURE} fill-foreground`}
                                    style={{ fontSize: small ? 10.5 : 12, textAnchor: "middle" }}
                                    x={x + bar / 2}
                                    y={Math.min(y(peak), y(0)) - 6}
                                >
                                    {show(total)}
                                </text>
                            ) : null}
                            {index % labelEvery === 0 || last ? (
                                <text
                                    className={`${FIGURE} ${last ? "fill-foreground" : "fill-muted-foreground"}`}
                                    style={{ fontSize: 12, textAnchor: "middle" }}
                                    x={x + bar / 2}
                                    y={height - 4}
                                >
                                    {words.columnName(grouping, column, columns)}
                                </text>
                            ) : null}
                            <rect
                                fill="transparent"
                                height={height - BASE}
                                onPointerEnter={() => setHovered(index)}
                                onPointerLeave={() => setHovered(null)}
                                width={slot}
                                x={LEFT + index * slot}
                                y={0}
                            />
                        </g>
                    );
                })}
            </svg>
            {hover && hovered !== null ? (
                <div
                    className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 z-10 w-max min-w-40 rounded-lg border p-2.5 text-xs shadow-lg"
                    style={{
                        left: Math.min(Math.max(LEFT + hovered * slot + slot / 2, 90), Math.max(width - 90, 90)),
                        transform: "translateX(-50%)",
                    }}
                >
                    <div className="text-muted-foreground mb-1">{words.columnName(grouping, hover, columns)}</div>
                    {stacked
                        ? rows
                              .filter((row) => (row.values[hovered] ?? 0) > 0)
                              .map(({ label: row, values }) => (
                                  <div className="flex items-center gap-2 py-0.5" key={row.id}>
                                      <Swatch color={row.color ?? "currentColor"} />
                                      <span className="min-w-0 flex-1 truncate">{words.rowName(row, kind)}</span>
                                      <span className="dash-figure">{show(values[hovered] ?? 0)}</span>
                                  </div>
                              ))
                        : null}
                    <div className="border-border mt-1 flex justify-between gap-4 border-t pt-1 font-medium">
                        <span>{words.copy.table.total}</span>
                        <span className="dash-figure">{show(totals.values[hovered] ?? 0)}</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

import { useState } from "react";
import type { ReactNode } from "react";

import { FIGURE } from "../parts";
import { useBox } from "../use-box";
import { axisFor } from "./model";
import type { Slot } from "./model";

const GUTTER = 34;
const FOOT = 20;
const HEAD = 6;
const BAR_SHARE = 0.62;
const MIN_SEGMENT = 2;
const SEGMENT_RADIUS = 2.5;
const BREAK_FROM_TOP = 14;
const TICK = `${FIGURE} text-[11px]`;

interface TipProps {
    children: ReactNode;
    left: number;
    top: number;
    width: number;
}

/** A readout pinned to a point of a chart, flipping to the left of it near the right edge. */
export function Tip({ children, left, top, width }: TipProps) {
    const flip = left > width * 0.6;
    return (
        <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-10 w-max max-w-64 rounded-lg border px-3 py-2 text-xs shadow-md"
            style={{ left, top, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, 0)` }}
        >
            {children}
        </div>
    );
}

interface Scale {
    height: number;
    hi: number;
    lo: number;
}

const yAt = ({ height, hi, lo }: Scale, value: number) => HEAD + ((hi - value) / (hi - lo)) * (height - FOOT - HEAD);

interface Segment {
    color: string;
    from: number;
    id: string;
    to: number;
}

function segmentsOf(slot: Slot, scale: Scale): Segment[] {
    let up = 0;
    let down = 0;
    return slot.parts.flatMap((part) => {
        if (part.value === 0) {
            return [];
        }
        const from = part.value > 0 ? up : down;
        const to = Math.min(Math.max(from + part.value, scale.lo), scale.hi);
        if (part.value > 0) {
            up = from + part.value;
        } else {
            down = from + part.value;
        }
        return [{ color: part.color, from: Math.min(Math.max(from, scale.lo), scale.hi), id: part.id, to }];
    });
}

interface StackedProps {
    aspect: number;
    format: (value: number) => string;
    label: string;
    labelOf: (slot: Slot) => string;
    renderTip: (slot: Slot) => ReactNode;
    slots: readonly Slot[];
    ticks: (slot: Slot, index: number) => string | null;
}

/** Bars stacked by group, the largest at the bottom, with one bar far above the rest cut off by a break. */
export function StackedChart({ aspect, format, label, labelOf, renderTip, slots, ticks }: StackedProps) {
    const [ref, { width }] = useBox();
    const [active, setActive] = useState<number | null>(null);
    const above = axisFor(slots.map((slot) => slot.parts.reduce((all, part) => all + Math.max(part.value, 0), 0)));
    const below = axisFor(slots.map((slot) => slot.parts.reduce((all, part) => all + Math.max(-part.value, 0), 0)));
    const hasBelow = slots.some((slot) => slot.parts.some((part) => part.value < 0));
    const height = Math.max(Math.round(width / aspect), 160);
    const scale: Scale = { height, hi: above.cap, lo: hasBelow ? -below.cap : 0 };
    const tickValues = [...above.ticks, ...(hasBelow ? below.ticks.slice(1).map((tick) => -tick) : [])];
    const gap = (width - GUTTER) / Math.max(slots.length, 1);
    const barWidth = gap * BAR_SHARE;
    const zero = yAt(scale, 0);
    const shown = active === null ? undefined : slots[active];
    return (
        <div className="relative w-full" ref={ref} style={{ height }}>
            {width > 0 ? (
                <svg
                    aria-label={label}
                    className="block"
                    height={height}
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
                    role="img"
                    width={width}
                >
                    {tickValues.map((tick) => (
                        <g key={tick}>
                            <path d={`M${GUTTER} ${yAt(scale, tick)}H${width}`} stroke="var(--color-border)" />
                            <text className={TICK} fill="var(--color-muted-foreground)" x={0} y={yAt(scale, tick) + 4}>
                                {tick === 0 ? "0" : format(tick)}
                            </text>
                        </g>
                    ))}
                    {slots.map((slot, index) => {
                        const x = GUTTER + index * gap + (gap - barWidth) / 2;
                        const tick = ticks(slot, index);
                        const segments = segmentsOf(slot, scale);
                        const tall = slot.parts.reduce((all, part) => all + Math.max(part.value, 0), 0) > scale.hi;
                        return (
                            <g key={slot.key}>
                                {active === index ? (
                                    <rect
                                        fill="var(--color-app-hover)"
                                        height={height - FOOT - HEAD}
                                        rx={6}
                                        width={gap}
                                        x={GUTTER + index * gap}
                                        y={HEAD}
                                    />
                                ) : null}
                                {segments.length === 0 ? (
                                    <rect
                                        fill="var(--color-app-strong)"
                                        height={MIN_SEGMENT}
                                        rx={1}
                                        width={barWidth}
                                        x={x}
                                        y={zero - MIN_SEGMENT}
                                    />
                                ) : null}
                                {segments.map((segment) => {
                                    const top = yAt(scale, Math.max(segment.from, segment.to));
                                    const bottom = yAt(scale, Math.min(segment.from, segment.to));
                                    return (
                                        <rect
                                            fill={segment.color}
                                            height={Math.max(bottom - top - 1, MIN_SEGMENT)}
                                            key={segment.id}
                                            rx={SEGMENT_RADIUS}
                                            width={barWidth}
                                            x={x}
                                            y={top + 0.5}
                                        />
                                    );
                                })}
                                {tall ? (
                                    <path
                                        d={`M${x - 3} ${HEAD + BREAK_FROM_TOP}l${barWidth + 6} -5M${x - 3} ${HEAD + BREAK_FROM_TOP + 5}l${barWidth + 6} -5`}
                                        stroke="var(--color-card)"
                                        strokeWidth={2.5}
                                    />
                                ) : null}
                                {tick === null ? null : (
                                    <text
                                        className={TICK}
                                        fill="var(--color-muted-foreground)"
                                        style={{ textAnchor: "middle" }}
                                        x={x + barWidth / 2}
                                        y={height - 3}
                                    >
                                        {tick}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {slots.map((slot, index) => (
                        <rect
                            fill="transparent"
                            aria-label={labelOf(slot)}
                            height={height}
                            key={`hit-${slot.key}`}
                            onBlur={() => setActive(null)}
                            onFocus={() => setActive(index)}
                            onPointerEnter={() => setActive(index)}
                            onPointerLeave={() => setActive(null)}
                            tabIndex={0}
                            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an SVG rect cannot be an img element.
                            role="img"
                            width={gap}
                            x={GUTTER + index * gap}
                            y={0}
                        />
                    ))}
                </svg>
            ) : null}
            {shown && active !== null ? (
                <Tip left={GUTTER + active * gap + gap / 2} top={HEAD} width={width}>
                    {renderTip(shown)}
                </Tip>
            ) : null}
        </div>
    );
}

export type { Axis } from "./model";

import type { ReactNode } from "react";

import { stretch } from "@/components/dashboard/accounts/parts";

import { FIGURE } from "../parts";

export const AXIS = `${FIGURE} text-muted-foreground text-[12.5px] leading-[17px] whitespace-nowrap`;
export const AXIS_NOW = "text-foreground font-semibold";

export interface Gridline {
    /** Pixels down from the plot's top edge. */
    at: number;
    label: string;
    zero?: boolean;
}

interface PlotProps {
    children: ReactNode;
    /** Room at the left for the axis figures. */
    gutter: number;
    height: number;
    lines: readonly Gridline[];
}

/** The plot's box inside a card: gridlines, their figures in the gutter, and the marks drawn over them. */
export function Plot({ children, gutter, height, lines }: PlotProps) {
    return (
        <div className="absolute top-6 right-3" style={{ height, left: gutter }}>
            {lines.map((line) => (
                <div
                    className={`absolute inset-x-0 h-px ${line.zero ? "bg-muted-foreground" : "bg-app-strong"}`}
                    key={line.at}
                    style={{ top: Math.floor(line.at) }}
                >
                    <span className={`${AXIS} absolute -top-[9px] right-full mr-2`}>{line.label}</span>
                </div>
            ))}
            {children}
        </div>
    );
}

/** Curves stretched over the plot: 100 units wide whatever the card's width, strokes kept at their own weight. */
export function Curves({ children, height }: { children: ReactNode; height: number }) {
    return (
        <svg
            aria-hidden
            className="absolute inset-0 size-full overflow-visible"
            ref={stretch}
            viewBox={`0 0 100 ${height}`}
        >
            {children}
        </svg>
    );
}

export function Stroke({ color, d }: { color: string; d: string }) {
    return <path d={d} fill="none" stroke={color} strokeWidth={2} style={{ vectorEffect: "non-scaling-stroke" }} />;
}

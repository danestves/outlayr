import type { CSSProperties } from "react";

const GHOST: CSSProperties = { fill: "none", stroke: "var(--color-app-ghost)" };
const HEIGHTS = [118, 126.8, 106.2, 132.8, 100.3, 120.9, 112.1, 129.8, 109.2, 118, 138.7, 103.2] as const;
const BASE = 161.5;
const FIRST = 20;
const PITCH = 93.18;

/** Twelve outlined bars with nothing in them, faded out under the words of a year too young to chart. */
export function QuietYear() {
    return (
        <svg
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-auto w-full"
            style={{ maskImage: "linear-gradient(black 46.4%, transparent 67.5%)" }}
            viewBox="0 0 1158 295"
        >
            <path d={`M20 ${BASE}H1138`} style={GHOST} />
            {HEIGHTS.map((height, index) => (
                <rect
                    height={height}
                    key={index}
                    rx={3}
                    style={GHOST}
                    width={46.6}
                    x={FIRST + index * PITCH}
                    y={BASE - height}
                />
            ))}
        </svg>
    );
}

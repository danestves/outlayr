import type { CSSProperties } from "react";

const GHOST: CSSProperties = { fill: "none", stroke: "var(--color-app-ghost)" };

const RIBBONS = [
    "M87.9 40.3C311.1 40.3,311.1 79.8,534.3 79.8V221.9C311.1 221.9,311.1 182.4,87.9 182.4Z",
    "M87.9 235.1C311.1 235.1,311.1 221.9,534.3 221.9V277.2C311.1 277.2,311.1 290.4,87.9 290.4Z",
    "M546.3 79.8C763.9 79.8,763.9 14,981.5 14V73.2C763.9 73.2,763.9 139,546.3 139Z",
    "M546.3 139C763.9 139,763.9 99.5,981.5 99.5V146.9C763.9 146.9,763.9 186.4,546.3 186.4Z",
    "M546.3 186.4C763.9 186.4,763.9 173.2,981.5 173.2V204.8C763.9 204.8,763.9 218,546.3 218Z",
    "M546.3 218C763.9 218,763.9 231.1,981.5 231.1V254.8C763.9 254.8,763.9 241.7,546.3 241.7Z",
    "M546.3 241.7C763.9 241.7,763.9 281.1,981.5 281.1V300.9C763.9 300.9,763.9 261.4,546.3 261.4Z",
    "M546.3 261.4C763.9 261.4,763.9 327.2,981.5 327.2V343C763.9 343,763.9 277.2,546.3 277.2Z",
] as const;

const BARS = [
    [534.3, 79.8, 197.4],
    [75.9, 40.3, 142.1],
    [75.9, 235.1, 55.3],
    [981.5, 14, 59.2],
    [981.5, 99.5, 47.4],
    [981.5, 173.2, 31.6],
    [981.5, 231.1, 23.7],
    [981.5, 281.1, 19.7],
    [981.5, 327.2, 15.8],
] as const;

const LABELS = [
    [53.2, 25.8, 60],
    [53.2, 220.6, 60],
    [1003.5, 39.1, 89.4],
    [1003.5, 118.7, 89.4],
    [1003.5, 184.5, 89.4],
    [1003.5, 238.5, 89.4],
    [1003.5, 286.5, 89.4],
    [1003.5, 330.6, 89.4],
] as const;

/** An outline of a flow with no amounts in it, faded out under the words of an empty span. */
export function QuietFlow() {
    return (
        <svg
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-auto w-full"
            style={{ maskImage: "linear-gradient(black 41.8%, transparent 50.7%)" }}
            viewBox="0 0 1158 698"
        >
            {RIBBONS.map((path) => (
                <path d={path} key={path} style={GHOST} />
            ))}
            {BARS.map(([x, y, height]) => (
                <rect height={height} key={`${x}-${y}`} rx={3} style={GHOST} width={12} x={x} y={y} />
            ))}
            {LABELS.map(([x, y, width]) => (
                <rect height={9} key={`${x}-${y}`} rx={4.5} style={GHOST} width={width} x={x} y={y} />
            ))}
        </svg>
    );
}

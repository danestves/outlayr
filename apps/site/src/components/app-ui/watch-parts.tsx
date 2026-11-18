import type { CSSProperties, ReactNode } from "react";

import { AppFragment, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { SystemText } from "./chrome";
import { formatClock } from "./dates";
import { fontAscent, monoWidth } from "./type";

export const WATCH_SIZE = { height: 248, width: 208 } as const;

export const GRID = {
    accent: "#ec603b",
    ghost: "#6b665c",
    hairline: "#353026",
    income: "#3fd99b",
    ink: "#f2efe8",
    inkOnPaper: "#17150f",
    key: "#1c1c1e",
    muted: "#a8a093",
    over: "#f17879",
    paper: "#f2f0ea",
} as const;

export const SAFE_INSET = 2;

export const BOTTOM_INSET = 8;

export const CONTENT_TOP = { bare: 44, titled: 60, toolbar: 56 } as const;

const CHROME_INSET = 16;
const CLOCK_SIZE = 17;
const CLOCK_BASELINE = 32;
const BUTTON_SIZE = 35;
const BUTTON_INSET = 15;
const BUTTON_TOP = 18;
const TITLE_TOP = 39;
const GLASS = "#202020";

const MONO_ADVANCE = 0.6;
const MONO_LINE = 1.3;
const KICKER_SIZE = 11;
const KICKER_TRACKING = 1.1;
const HEX = /^#?([0-9a-f]{6})$/i;

const TRUNCATED: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis" };

export const cssColor = (value: string) => {
    const digits = HEX.exec(value)?.[1];
    return digits === undefined ? GRID.muted : `#${digits}`;
};

const monoLine = (size: number) => `${size * MONO_LINE}px`;

export const kickerWidth = (text: string) => monoWidth(text.toUpperCase(), KICKER_SIZE, MONO_ADVANCE, KICKER_TRACKING);

interface MonoProps {
    children: ReactNode;
    color: string;
    medium?: boolean;
    size: number;
}

export function Mono({ children, color, medium = false, size }: MonoProps) {
    return (
        <span
            className="font-mono"
            style={{
                color,
                flexShrink: 0,
                fontSize: size,
                fontWeight: medium ? 500 : 400,
                lineHeight: monoLine(size),
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </span>
    );
}

interface MonoFitProps {
    available: number;
    color: string;
    ghost?: string;
    medium?: boolean;
    minScale: number;
    size: number;
    text: string;
}

export function MonoFit({ available, color, ghost = "", medium = false, minScale, size, text }: MonoFitProps) {
    const natural = monoWidth(`${text}${ghost}`, size, MONO_ADVANCE);
    const fitted = Math.max(Math.min(size, (size * available) / natural), size * minScale);
    const truncates = monoWidth(`${text}${ghost}`, fitted, MONO_ADVANCE) > available;
    const style: CSSProperties = {
        color,
        flexShrink: truncates ? 1 : 0,
        fontSize: fitted,
        fontWeight: medium ? 500 : 400,
        lineHeight: monoLine(fitted),
        maxWidth: available,
        whiteSpace: "nowrap",
    };
    if (truncates) {
        Object.assign(style, TRUNCATED);
    }
    return (
        <span className="font-mono" style={style}>
            {text}
            {ghost === "" ? null : <span style={{ color: GRID.ghost }}>{ghost}</span>}
        </span>
    );
}

export function Kicker({ children, color = GRID.muted }: { children: string; color?: string }) {
    return (
        <span
            className="font-mono"
            style={{
                color,
                fontSize: KICKER_SIZE,
                letterSpacing: `${KICKER_TRACKING}px`,
                lineHeight: monoLine(KICKER_SIZE),
                whiteSpace: "nowrap",
                ...TRUNCATED,
            }}
        >
            {children.toUpperCase()}
        </span>
    );
}

export function Compact({
    children,
    color = GRID.ink,
    size,
    wraps = false,
}: {
    children: string;
    color?: string;
    size: number;
    wraps?: boolean;
}) {
    return (
        <SystemText size={size} style={{ color, ...(wraps ? { whiteSpace: "normal" } : TRUNCATED) }} weight={400}>
            {children}
        </SystemText>
    );
}

export function Hairline({ color = GRID.hairline }: { color?: string }) {
    return <div style={{ background: color, height: 1 }} />;
}

export function CategoryMark({ color, frame }: { color: string; frame: number }) {
    return (
        <div style={{ alignItems: "center", width: frame }}>
            <div style={{ background: cssColor(color), borderRadius: 2, height: 10, width: 10 }} />
        </div>
    );
}

interface GlyphPath {
    height: number;
    path: string;
    stroke: number;
    width: number;
}

export const GLYPHS = {
    checkmark: { height: 16, path: "M1.8 8.6L6.4 13.6L15.4 2.2", stroke: 2.8, width: 17 },
    chevronLeft: { height: 17, path: "M8.5 1.5L1.5 8.5L8.5 15.5", stroke: 2.6, width: 10 },
    deleteLeft: {
        height: 17,
        path: "M8 1.5H19.5A2.5 2.5 0 0 1 22 4V13A2.5 2.5 0 0 1 19.5 15.5H8L1.5 8.5ZM11.5 5.5L17 11M17 5.5L11.5 11",
        stroke: 1.6,
        width: 23,
    },
    plus: { height: 16, path: "M8 1.2V14.8M1.2 8H14.8", stroke: 2.3, width: 16 },
    xmark: { height: 13, path: "M1.5 1.5L11.5 11.5M11.5 1.5L1.5 11.5", stroke: 2.4, width: 13 },
} as const satisfies Record<string, GlyphPath>;

export function Glyph({ color, height, path, stroke, width }: GlyphPath & { color: string }) {
    return (
        <svg fill="none" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
            <path d={path} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} />
        </svg>
    );
}

export function Clock({ centered = false, now }: { centered?: boolean; now: Date }) {
    const { locale } = useReplica();
    const place: CSSProperties = centered
        ? { alignItems: "center", left: 0, right: 0 }
        : { alignItems: "flex-end", right: CHROME_INSET };
    return (
        <div style={{ position: "absolute", top: CLOCK_BASELINE - fontAscent(CLOCK_SIZE), ...place }}>
            <SystemText size={CLOCK_SIZE} style={{ color: "#fff" }} weight={600}>
                {formatClock(now, locale)}
            </SystemText>
        </div>
    );
}

export function NavTitle({ children }: { children: string }) {
    return (
        <div style={{ alignItems: "flex-end", position: "absolute", right: CHROME_INSET, top: TITLE_TOP }}>
            <Mono color={GRID.muted} size={13}>
                {children}
            </Mono>
        </div>
    );
}

export function ToolbarButton({
    children,
    fill = GLASS,
    side,
}: {
    children: ReactNode;
    fill?: string;
    side: "leading" | "trailing";
}) {
    return (
        <div
            style={{
                alignItems: "center",
                background: fill,
                borderRadius: BUTTON_SIZE / 2,
                height: BUTTON_SIZE,
                justifyContent: "center",
                position: "absolute",
                top: BUTTON_TOP,
                width: BUTTON_SIZE,
                ...(side === "leading" ? { left: BUTTON_INSET } : { right: BUTTON_INSET }),
            }}
        >
            {children}
        </div>
    );
}

export function ScrollIndicator() {
    return (
        <>
            <div
                style={{
                    background: "#282828",
                    borderRadius: 3,
                    height: 43,
                    left: 200,
                    position: "absolute",
                    top: 46,
                    width: 6,
                }}
            >
                <div style={{ background: "#fff", borderRadius: 3, height: 34 }} />
            </div>
            <div
                style={{
                    background: "#5b5b5b",
                    borderRadius: 2.25,
                    height: 4.5,
                    left: 200.75,
                    position: "absolute",
                    top: 92,
                    width: 4.5,
                }}
            />
        </>
    );
}

export function WatchFragment({ children, ...canvas }: CanvasProps & { children: ReactNode; label: string }) {
    return (
        <AppFragment {...canvas} {...WATCH_SIZE}>
            <div style={{ background: "#000", inset: 0, position: "absolute" }} />
            {children}
        </AppFragment>
    );
}

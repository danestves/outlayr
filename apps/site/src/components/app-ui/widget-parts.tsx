import type { CSSProperties, ReactNode } from "react";

import type { WidgetPalette } from "../../../../native/src/widgets/palette";
import { useReplica } from "./canvas";
import type { AppTheme } from "./canvas";
import { monoWidth, roundedTrak, textLineHeight } from "./type";

type TextStyle = CSSProperties & Record<`--app-${string}`, string>;

export type WidgetFamily = "small" | "medium" | "large";

const NARROW = 493 / 3;
const WIDE = 1048 / 3;
const TALL = 1095 / 3;

export const WIDGET_SIZE = {
    large: { height: TALL, width: WIDE },
    medium: { height: NARROW, width: WIDE },
    small: { height: NARROW, width: NARROW },
} as const satisfies Record<WidgetFamily, { height: number; width: number }>;

export const CONTENT_MARGIN = 18;

export const contentWidth = (family: WidgetFamily) => WIDGET_SIZE[family].width - CONTENT_MARGIN * 2;

const SHEEN = {
    dark: "linear-gradient(rgba(255, 255, 255, 0.125), rgba(255, 255, 255, 0.045))",
    light: "linear-gradient(rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.06))",
} as const satisfies Record<AppTheme, string>;

const RIM = {
    dark: "inset 0 0.34px 0 rgba(255, 255, 255, 0.14), inset 0 0.67px 0 rgba(255, 255, 255, 0.2), inset 0 -0.34px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(255, 255, 255, 0.14)",
    light: "inset 0 0.67px 0 #fff, inset 0 1.5px 2px rgba(255, 255, 255, 0.6), inset 0 -0.67px 0 #fff, inset 0 -1.5px 2px rgba(255, 255, 255, 0.6)",
} as const satisfies Record<AppTheme, string>;

const TRACK = { dark: "#3e3c3a", light: "#e4e2df" } as const satisfies Record<AppTheme, string>;

const PRIMARY = { dark: "#fff", light: "#000" } as const satisfies Record<AppTheme, string>;

export const primaryColor = (theme: AppTheme) => PRIMARY[theme];

export interface WidgetPlacement {
    x: number;
    y: number;
}

interface WidgetSurfaceProps {
    at?: WidgetPlacement;
    background: string;
    children: ReactNode;
    family: WidgetFamily;
    row?: boolean;
}

export function WidgetSurface({ at, background, children, family, row = false }: WidgetSurfaceProps) {
    const { theme } = useReplica();
    return (
        <div
            style={{
                ...WIDGET_SIZE[family],
                background: `${SHEEN[theme]}, ${background}`,
                borderRadius: 28,
                boxShadow: RIM[theme],
                flexDirection: row ? "row" : "column",
                gap: row ? 14 : 0,
                left: at?.x,
                overflow: "hidden",
                padding: CONTENT_MARGIN,
                position: at ? "absolute" : "relative",
                top: at?.y,
            }}
        >
            {children}
        </div>
    );
}

const SF_MONO_ADVANCE = 1266 / 2048;
const FALLBACK_ADVANCE = 0.6;

const ROUNDED_SEMIBOLD = new Map([
    ["0", 0.639],
    ["1", 0.468],
    ["2", 0.591],
    ["3", 0.617],
    ["4", 0.633],
    ["5", 0.612],
    ["6", 0.628],
    ["7", 0.563],
    ["8", 0.635],
    ["9", 0.629],
    ["$", 0.633],
    [",", 0.27],
    [".", 0.27],
    ["€", 0.761],
    ["R", 0.626],
    ["%", 0.84],
    [" ", 0.2],
    [" ", 0.2],
    [" ", 0.2],
    ["−", 0.633],
    ["-", 0.438],
    ["+", 0.633],
]);

function roundedWidth(text: string, size: number): number {
    const glyphs = [...text];
    const advance = glyphs.reduce((sum, glyph) => sum + (ROUNDED_SEMIBOLD.get(glyph) ?? FALLBACK_ADVANCE), 0);
    return (advance + glyphs.length * Number.parseFloat(roundedTrak(size))) * size;
}

const SCALE_STEP = 0.02;

function fittedSize(text: string, size: number, available: number): number {
    let fitted = size;
    for (let pass = 0; pass < 3 && roundedWidth(text, fitted) > available; pass += 1) {
        fitted *= available / roundedWidth(text, fitted);
    }
    return fitted === size ? size : size * Math.round(fitted / size / SCALE_STEP) * SCALE_STEP;
}

const lineHeight = (size: number) => `${textLineHeight(size)}px`;

interface TextProps {
    children: ReactNode;
    color: string;
    truncate?: boolean;
}

const TRUNCATED: CSSProperties = { flexShrink: 1, overflow: "hidden", textOverflow: "ellipsis" };

export function Eyebrow({ children, color, size = 10, truncate = false }: TextProps & { size?: number }) {
    const style: TextStyle = {
        color,
        flexShrink: 0,
        fontFamily: "var(--font-system-mono)",
        fontSize: size,
        fontWeight: 500,
        lineHeight: lineHeight(size),
        whiteSpace: "nowrap",
        ...(truncate ? TRUNCATED : undefined),
    };
    return <span style={style}>{children}</span>;
}

interface RoundedProps extends TextProps {
    size: number;
    width?: number;
    weight: 500 | 600;
}

export function Rounded({ children, color, size, truncate = false, weight, width }: RoundedProps) {
    const style: TextStyle = {
        "--app-trak": roundedTrak(size),
        color,
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
        fontSize: size,
        fontWeight: weight,
        lineHeight: lineHeight(size),
        whiteSpace: "nowrap",
        width,
        ...(truncate ? TRUNCATED : undefined),
    };
    return <span style={style}>{children}</span>;
}

interface FittedProps {
    available: number;
    color: string;
    minScale: number;
    size: number;
    text: string;
}

export function Fitted({ available, color, minScale, size, text }: FittedProps) {
    const natural = fittedSize(text, size, available);
    const fitted = Math.max(natural, size * minScale);
    const truncates = natural < fitted;
    return (
        <Rounded
            color={color}
            size={fitted}
            truncate={truncates}
            weight={600}
            width={fitted < size ? Math.min(roundedWidth(text, fitted), truncates ? available : Infinity) : undefined}
        >
            {text}
        </Rounded>
    );
}

export function FixedSpace({ height }: { height: number }) {
    return <div style={{ height }} />;
}

export function Spacer({ grows = true }: { grows?: boolean }) {
    return <div style={grows ? { flex: "1 1 0", minHeight: 8 } : { height: 8 }} />;
}

export function Hairline({ color }: { color: string }) {
    return <div style={{ background: color, height: 1 }} />;
}

interface HeroProps {
    available: number;
    caption: string;
    color: string;
    palette: WidgetPalette;
    size: number;
    value: string;
}

export function HeroLine({ available, caption, color, palette, size, value }: HeroProps) {
    return (
        <div style={{ alignItems: "baseline", flexDirection: "row", gap: 5 }}>
            <Fitted
                available={available - 5 - monoWidth(caption, 10, SF_MONO_ADVANCE)}
                color={color}
                minScale={0.5}
                size={size}
                text={value}
            />
            <Eyebrow color={palette.muted}>{caption}</Eyebrow>
        </div>
    );
}

export function Rail({ color, fraction }: { color: string; fraction: number }) {
    const { theme } = useReplica();
    return (
        <div style={{ background: TRACK[theme], borderRadius: 2, height: 4 }}>
            <div style={{ background: color, borderRadius: 2, height: 4, width: `${fraction * 100}%` }} />
        </div>
    );
}

interface CellProps {
    label: string;
    leading: boolean;
    palette: WidgetPalette;
    value: string;
    width: number;
}

const CELL_INSET = 10;

export function Cell({ label, leading, palette, value, width }: CellProps) {
    return (
        <div style={{ flex: "1 1 0", flexDirection: "row" }}>
            {leading ? null : <div style={{ background: palette.border, width: 1 }} />}
            <div style={{ flex: "1 1 0", gap: 2, justifyContent: "center", paddingLeft: leading ? 0 : CELL_INSET }}>
                <Eyebrow color={palette.muted} truncate>
                    {label}
                </Eyebrow>
                <Fitted
                    available={width - (leading ? 0 : CELL_INSET + 1)}
                    color={palette.ink}
                    minScale={0.7}
                    size={13}
                    text={value}
                />
            </div>
        </div>
    );
}

export function Cells({ children }: { children: ReactNode }) {
    return <div style={{ flex: "1 1 auto", flexDirection: "row" }}>{children}</div>;
}

export function Dot({ color, size }: { color: string; size: number }) {
    return <div style={{ background: color, borderRadius: size / 2, height: size, width: size }} />;
}

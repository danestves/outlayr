import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { LocaleContext, MONO, paletteFor, SANS, ThemeContext, useLocale, useTheme } from "./theme";
import type { Locale, Mode } from "./theme";

export function Film({ mode, locale = "en", children }: { children: ReactNode; locale?: Locale; mode: Mode }) {
    const palette = paletteFor(mode);
    return (
        <LocaleContext.Provider value={locale}>
            <ThemeContext.Provider value={palette}>
                <AbsoluteFill
                    style={{
                        backgroundColor: palette.canvas,
                        color: palette.fg,
                        fontFamily: SANS,
                        fontVariantNumeric: "tabular-nums",
                        WebkitFontSmoothing: "antialiased",
                    }}
                >
                    {children}
                </AbsoluteFill>
            </ThemeContext.Provider>
        </LocaleContext.Provider>
    );
}

export function useSeconds() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return frame / fps;
}

export const reveal = (p: number, distance = 36, blur = 16): CSSProperties => ({
    filter: p < 0.999 ? `blur(${(1 - p) * blur}px)` : undefined,
    opacity: Math.min(1, p * 1.4),
    translate: `0 ${(1 - p) * distance}px`,
});

function splitMoney(value: number) {
    const cents = Math.round(Math.abs(value) * 100);
    return {
        cents: String((cents % 100) + 100).slice(1),
        negative: value < 0 && cents > 0,
        whole: Math.floor(cents / 100).toLocaleString("en-US"),
    };
}

export function formatMoney(value: number, { plus = false, symbol = "$" } = {}) {
    const { cents, negative, whole } = splitMoney(value);
    if (negative) {
        return `−${symbol}${whole}.${cents}`;
    }
    return `${plus && value > 0 ? "+" : ""}${symbol}${whole}.${cents}`;
}

export function Micro({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    const theme = useTheme();
    return (
        <span
            style={{
                color: theme.muted,
                fontFamily: MONO,
                fontSize: 20,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                ...style,
            }}
        >
            {children}
        </span>
    );
}

export function BigMoney({ value, size = 104, sign = "" }: { size?: number; sign?: string; value: number }) {
    const theme = useTheme();
    const { cents, whole } = splitMoney(value);
    return (
        <div
            style={{
                alignItems: "baseline",
                display: "flex",
                fontSize: size,
                fontWeight: 300,
                letterSpacing: "-0.035em",
                lineHeight: 1,
            }}
        >
            <span style={{ color: theme.muted, fontSize: "0.36em", letterSpacing: 0, marginRight: "0.1em" }}>
                {sign}$
            </span>
            <span>{whole}</span>
            <span style={{ color: theme.muted, fontSize: "0.38em", letterSpacing: 0 }}>.{cents}</span>
        </div>
    );
}

export type LogoName =
    | "ally"
    | "amazon"
    | "amex"
    | "applecard"
    | "banesco"
    | "cash"
    | "chase"
    | "chatgpt"
    | "costco"
    | "icloud"
    | "netflix"
    | "paypal"
    | "planet"
    | "rent"
    | "spotify"
    | "verizon"
    | "zinli";

const TILE_INSET = 0.74;
const ACCOUNT_INSET = 0.75;
const ACCOUNT_LOGOS = new Set<LogoName>(["ally", "amex", "applecard", "banesco", "cash", "chase", "paypal", "zinli"]);

export function Logo({ name, size, bare = false }: { bare?: boolean; name: LogoName; size: number }) {
    const theme = useTheme();
    if (name === "costco") {
        const inner = size * (bare ? 1 : TILE_INSET);
        return (
            <div style={{ display: "grid", flexShrink: 0, height: size, placeItems: "center", width: size }}>
                <div
                    style={{
                        background: "#FFFFFF",
                        borderRadius: inner * 0.27,
                        boxShadow: `inset 0 0 0 1.5px ${theme.mode === "dark" ? "rgba(0,0,0,0)" : theme.rule}`,
                        display: "grid",
                        height: inner,
                        placeItems: "center",
                        width: inner,
                    }}
                >
                    <Img src={staticFile("logos/costco.png")} style={{ display: "block", width: inner * 0.84 }} />
                </div>
            </div>
        );
    }
    const src = staticFile(`logos/${name}${theme.mode === "dark" ? "-dark" : ""}.webp`);
    if (bare) {
        return (
            <div style={{ borderRadius: size * 0.27, flexShrink: 0, height: size, overflow: "hidden", width: size }}>
                <Img src={src} style={{ display: "block", height: size, scale: String(1 / TILE_INSET), width: size }} />
            </div>
        );
    }
    if (!ACCOUNT_LOGOS.has(name)) {
        return <Img src={src} style={{ display: "block", flexShrink: 0, height: size, width: size }} />;
    }
    const inner = size * ACCOUNT_INSET;
    return (
        <div style={{ display: "grid", flexShrink: 0, height: size, placeItems: "center", width: size }}>
            <div
                style={{
                    borderRadius: inner * 0.25,
                    height: inner,
                    overflow: "hidden",
                    position: "relative",
                    width: inner,
                }}
            >
                <Img
                    src={src}
                    style={{
                        display: "block",
                        height: size,
                        left: (inner - size) / 2,
                        position: "absolute",
                        top: (inner - size) / 2,
                        width: size,
                    }}
                />
            </div>
        </div>
    );
}

const ICONS = {
    bolt: ["M13.2 3 5.5 13.4h6.1L10.8 21l7.7-10.4h-6.1z"],
    cart: ["M2.8 4h2.1l2.2 10.6h10.6L19.8 7H6.1", "M10.2 10.5c1 .9 2.6.9 3.6 0"],
    check: ["M5 12.6l4.4 4.4L19 7.4"],
    chevron: ["M9.5 6l6 6-6 6"],
    house: [
        "M4.2 10.4 12 4l7.8 6.4v8.4a1.7 1.7 0 0 1-1.7 1.7H5.9a1.7 1.7 0 0 1-1.7-1.7z",
        "M9.4 15.2c1.5 1.3 3.7 1.3 5.2 0",
    ],
    keyboard: [
        "M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z",
        "M7 10.2h.01M10.3 10.2h.01M13.7 10.2h.01M17 10.2h.01M8 14h8",
    ],
    mic: [
        "M12 3.2a3 3 0 0 1 3 3v5.3a3 3 0 0 1-6 0V6.2a3 3 0 0 1 3-3z",
        "M5.6 11.2a6.4 6.4 0 0 0 12.8 0",
        "M12 17.6v3.2",
    ],
    scan: [
        "M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16",
        "M7.5 12h9",
    ],
    transfer: ["M16.5 4.5 20 8l-3.5 3.5M20 8H8.5M7.5 12.5 4 16l3.5 3.5M4 16h11.5"],
} as const;

type IconName = keyof typeof ICONS;

export function Icon({
    name,
    size,
    color,
    stroke = 1.6,
}: {
    color: string;
    name: IconName;
    size: number;
    stroke?: number;
}) {
    return (
        <svg fill="none" height={size} style={{ display: "block", flexShrink: 0 }} viewBox="0 0 24 24" width={size}>
            {ICONS[name].map((d) => (
                <path d={d} key={d} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} />
            ))}
            {name === "cart" ? (
                <>
                    <circle cx="9" cy="19" fill={color} r="1.3" />
                    <circle cx="16.4" cy="19" fill={color} r="1.3" />
                </>
            ) : null}
        </svg>
    );
}

export type Category = "groceries" | "rent" | "utilities";

const CATEGORY_ICON: Record<Category, IconName> = { groceries: "cart", rent: "house", utilities: "bolt" };

export function CategoryTile({ category, size }: { category: Category; size: number }) {
    const theme = useTheme();
    const { bg, ink } = theme[category];
    return (
        <div
            style={{
                background: bg,
                borderRadius: size * 0.28,
                display: "grid",
                flexShrink: 0,
                height: size,
                placeItems: "center",
                width: size,
            }}
        >
            <Icon color={ink} name={CATEGORY_ICON[category]} size={size * 0.55} />
        </div>
    );
}

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    const theme = useTheme();
    return (
        <div
            style={{
                background: theme.bg,
                borderRadius: 44,
                boxShadow: theme.shadow,
                padding: "40px 44px",
                position: "relative",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function RuledHeader({ left, right, style }: { left: ReactNode; right?: ReactNode; style?: CSSProperties }) {
    const theme = useTheme();
    return (
        <div
            style={{
                alignItems: "center",
                borderBottom: `1.5px solid ${theme.rule}`,
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: 14,
                ...style,
            }}
        >
            <Micro>{left}</Micro>
            {right === undefined ? null : <Micro>{right}</Micro>}
        </div>
    );
}

export interface Entry {
    amount: string;
    logo: LogoName;
    sub: string;
    title: string;
}

export function EntryRow({
    entry,
    height = 92,
    logoSize = 64,
    amountColor,
    style,
    trailing,
}: {
    amountColor?: string;
    entry: Entry;
    height?: number;
    logoSize?: number;
    style?: CSSProperties;
    trailing?: ReactNode;
}) {
    const theme = useTheme();
    return (
        <div style={{ alignItems: "center", display: "flex", gap: 22, height, ...style }}>
            <Logo name={entry.logo} size={logoSize} />
            <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                    {entry.title}
                </span>
                <span
                    style={{
                        color: theme.muted,
                        fontSize: 18,
                        letterSpacing: "0.04em",
                        lineHeight: 1.2,
                        textTransform: "uppercase",
                    }}
                >
                    {entry.sub}
                </span>
            </div>
            <span style={{ color: amountColor ?? theme.fg, fontSize: 30, letterSpacing: "-0.01em" }}>
                {entry.amount}
            </span>
            {trailing}
        </div>
    );
}

export const COSTCO: Record<Locale, Entry> = {
    en: { amount: "−$42.00", logo: "costco", sub: "Groceries · Chase", title: "Costco" },
    es: { amount: "−$42.00", logo: "costco", sub: "Súper · Chase", title: "Costco" },
};

interface ReceiptCopy {
    account: string;
    date: string;
    items: readonly (readonly [string, string])[];
    tax: string;
}

const RECEIPT_COPY: Record<Locale, ReceiptCopy> = {
    en: {
        account: "CHASE DEBIT",
        date: "09/14/26",
        items: [
            ["KS ORGANIC EGGS", "8.99"],
            ["BANANAS 3LB", "1.99"],
            ["KS SPARKLING 24CT", "11.49"],
            ["AVOCADOS BAG", "6.49"],
            ["ROTISSERIE CHKN", "4.99"],
            ["KS SOURDOUGH", "5.49"],
        ],
        tax: "TAX",
    },
    es: {
        account: "CHASE DEBITO",
        date: "14/09/26",
        items: [
            ["HUEVOS ORGANICOS KS", "8.99"],
            ["PLATANOS 3LB", "1.99"],
            ["AGUA CON GAS KS 24", "11.49"],
            ["AGUACATES BOLSA", "6.49"],
            ["POLLO ROSTIZADO", "4.99"],
            ["PAN MASA MADRE KS", "5.49"],
        ],
        tax: "IMPUESTO",
    },
};

export const RECEIPT_SIZE = { height: 486, width: 340 };
export const RECEIPT_LINES = { account: 12, date: 13, merchant: 0, total: 11 } as const;
const RECEIPT_TOP = 34;
const RECEIPT_LINE = 25;

const jagged = (width: number, height: number, tooth: number) => {
    const points: string[] = [];
    const count = Math.round(width / tooth);
    for (let i = 0; i <= count; i += 1) {
        points.push(`${(i * width) / count}px ${i % 2 === 0 ? 0 : 5}px`);
    }
    for (let i = count; i >= 0; i -= 1) {
        points.push(`${(i * width) / count}px ${height - (i % 2 === 0 ? 0 : 6)}px`);
    }
    return `polygon(${points.join(", ")})`;
};

const RECEIPT_HEAD = RECEIPT_LINE + 18;
const RECEIPT_RULE = 21.5;

export const receiptLineCenter = (index: number) => {
    if (index === 0) {
        return RECEIPT_TOP + RECEIPT_HEAD / 2;
    }
    const below = RECEIPT_TOP + RECEIPT_HEAD + (index - 1) * RECEIPT_LINE + RECEIPT_LINE / 2;
    return below + (index >= 3 ? RECEIPT_RULE : 0) + (index >= 9 ? RECEIPT_RULE : 0);
};

const NO_MARKS: readonly number[] = [];

export function Receipt({ marks = NO_MARKS }: { marks?: readonly number[] }) {
    const theme = useTheme();
    const copy = RECEIPT_COPY[useLocale()];
    const rule = <div style={{ borderTop: `1.5px dashed ${theme.paperInk}`, margin: "10px 0", opacity: 0.35 }} />;
    const line = (left: string, right: string, index: number, strong = false) => (
        <div
            key={left}
            style={{
                background: `rgba(194, 55, 27, ${0.14 * (marks[index] ?? 0)})`,
                borderRadius: 4,
                display: "flex",
                fontWeight: strong ? 500 : 400,
                height: RECEIPT_LINE,
                justifyContent: "space-between",
                margin: "0 -6px",
                padding: "0 6px",
            }}
        >
            <span>{left}</span>
            <span>{right}</span>
        </div>
    );
    return (
        <div style={{ filter: theme.dropShadow, height: RECEIPT_SIZE.height, width: RECEIPT_SIZE.width }}>
            <div
                style={{
                    background: [
                        "linear-gradient(171deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.035) 21%, rgba(255,255,255,0.4) 21.6%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.045) 63%, rgba(255,255,255,0.35) 63.6%, rgba(0,0,0,0) 84%)",
                        "linear-gradient(84deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.03) 34%, rgba(255,255,255,0.3) 34.5%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.035) 79%, rgba(255,255,255,0.25) 79.4%, rgba(0,0,0,0) 100%)",
                        theme.paper,
                    ].join(", "),
                    clipPath: jagged(RECEIPT_SIZE.width, RECEIPT_SIZE.height, 9),
                    color: theme.paperInk,
                    fontFamily: MONO,
                    fontSize: 16,
                    height: "100%",
                    lineHeight: `${RECEIPT_LINE}px`,
                    padding: `${RECEIPT_TOP}px 30px 0`,
                    width: "100%",
                }}
            >
                <div
                    style={{
                        background: `rgba(194, 55, 27, ${0.14 * (marks[0] ?? 0)})`,
                        borderRadius: 4,
                        fontFamily: SANS,
                        fontSize: 30,
                        fontWeight: 600,
                        height: RECEIPT_HEAD,
                        letterSpacing: "0.06em",
                        lineHeight: `${RECEIPT_HEAD}px`,
                        margin: "0 -6px",
                        padding: "0 6px",
                        textAlign: "center",
                    }}
                >
                    COSTCO
                </div>
                <div style={{ fontSize: 14, letterSpacing: "0.2em", textAlign: "center" }}>WHOLESALE</div>
                <div style={{ fontSize: 14, opacity: 0.7, textAlign: "center" }}>#1157 BROOKLYN NY</div>
                {rule}
                {copy.items.map(([name, price], i) => line(name, price, 3 + i))}
                {rule}
                {line("SUBTOTAL", "39.44", 9)}
                {line(copy.tax, "2.56", 10)}
                {line("TOTAL", "42.00", RECEIPT_LINES.total, true)}
                {line(copy.account, "****4417", RECEIPT_LINES.account)}
                {line(copy.date, "14:32", RECEIPT_LINES.date)}
            </div>
        </div>
    );
}

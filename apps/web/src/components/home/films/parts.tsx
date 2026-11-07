import type { CSSProperties, ReactNode } from "react";

import type { Act } from "@/stageshow/act";
import { Count } from "@/stageshow/motion/Count";

import "./films.css";

const MINUS = "−";

function splitMoney(value: number) {
    const cents = Math.round(Math.abs(value) * 100);
    return { cents: cents % 100, negative: value < 0 && cents > 0, whole: Math.floor(cents / 100) };
}

const group = (value: number) => Math.round(value).toLocaleString("en-US");
const pad = (value: number) => String(Math.round(value)).padStart(2, "0");

export function formatMoney(value: number, { plus = false } = {}) {
    const { cents, negative, whole } = splitMoney(value);
    const positive = plus && value > 0 ? "+" : "";
    const sign = negative ? MINUS : positive;
    return `${sign}$${group(whole)}.${pad(cents)}`;
}

export function Micro({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    return (
        <span className="film-micro" style={style}>
            {children}
        </span>
    );
}

export function Ruled({ left, right, style }: { left: ReactNode; right?: ReactNode; style?: CSSProperties }) {
    return (
        <div className="film-ruled" style={style}>
            <Micro>{left}</Micro>
            {right === undefined ? null : <Micro>{right}</Micro>}
        </div>
    );
}

export function Money({ value, size, sign = "" }: { sign?: string; size: number; value: number }) {
    const { cents, whole } = splitMoney(value);
    return (
        <div className="film-money" style={{ fontSize: size }}>
            <span className="film-money__sign">{sign}$</span>
            <Count duration={900} format={group} value={whole} />
            <span className="film-money__cents">
                .<Count duration={900} format={pad} value={cents} />
            </span>
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

export type FilmIconName = keyof typeof ICONS;

export function FilmIcon({ name, size, stroke = 1.6 }: { name: FilmIconName; size: number; stroke?: number }) {
    return (
        <svg
            aria-hidden
            fill="none"
            height={size}
            style={{ display: "block", flexShrink: 0 }}
            viewBox="0 0 24 24"
            width={size}
        >
            {ICONS[name].map((d) => (
                <path
                    d={d}
                    key={d}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={stroke}
                />
            ))}
            {name === "cart" ? (
                <>
                    <circle cx="9" cy="19" fill="currentColor" r="1.3" />
                    <circle cx="16.4" cy="19" fill="currentColor" r="1.3" />
                </>
            ) : null}
        </svg>
    );
}

export type Category = "groceries" | "rent" | "utilities";

const CATEGORY_ICON: Record<Category, FilmIconName> = { groceries: "cart", rent: "house", utilities: "bolt" };

export function CategoryTile({ category, size }: { category: Category; size: number }) {
    return (
        <span
            className="film-tile"
            style={{
                background: `var(--film-${category}-bg)`,
                color: `var(--film-${category}-ink)`,
                height: size,
                width: size,
            }}
        >
            <FilmIcon name={CATEGORY_ICON[category]} size={size * 0.55} />
        </span>
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

export function Logo({ name, size }: { name: LogoName; size: number }) {
    const box: CSSProperties = { borderRadius: size * 0.27, flexShrink: 0, height: size, width: size };
    if (name === "costco") {
        return (
            <span
                style={{
                    ...box,
                    background: "#ffffff",
                    boxShadow: "inset 0 0 0 1px var(--film-rule)",
                    display: "grid",
                    placeItems: "center",
                }}
            >
                <img
                    alt=""
                    height={Math.round((size * 0.84 * 57) / 200)}
                    src="/films/logos/costco.webp"
                    width={Math.round(size * 0.84)}
                />
            </span>
        );
    }
    return (
        <span style={{ ...box, overflow: "hidden", position: "relative" }}>
            <img alt="" className="light-only" height={size} src={`/films/logos/${name}.webp`} width={size} />
            <img alt="" className="dark-only" height={size} src={`/films/logos/${name}-dark.webp`} width={size} />
        </span>
    );
}

const HOLD_MS = 3000;
const FADE_MS = 600;

export async function loopBack<S>(act: Act<S>, out: Partial<S>, start: S) {
    await act.wait(HOLD_MS);
    act.put(out);
    await act.wait(FADE_MS);
    await act.snap({ ...start, ...out });
    act.put(start);
    await act.wait(FADE_MS);
}

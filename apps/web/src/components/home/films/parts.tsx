import FlashIcon from "@hugeicons/core-free-icons/FlashIcon";
import Home03Icon from "@hugeicons/core-free-icons/Home03Icon";
import KeyboardIcon from "@hugeicons/core-free-icons/KeyboardIcon";
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon";
import ScanIcon from "@hugeicons/core-free-icons/ScanIcon";
import ShoppingCart01Icon from "@hugeicons/core-free-icons/ShoppingCart01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
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
    bolt: FlashIcon,
    cart: ShoppingCart01Icon,
    check: Tick02Icon,
    house: Home03Icon,
    keyboard: KeyboardIcon,
    mic: Mic01Icon,
    scan: ScanIcon,
} as const;

export type FilmIconName = keyof typeof ICONS;

export function FilmIcon({ name, size, stroke = 1.6 }: { name: FilmIconName; size: number; stroke?: number }) {
    return (
        <HugeiconsIcon
            aria-hidden
            icon={ICONS[name]}
            size={size}
            strokeWidth={stroke}
            style={{ display: "block", flexShrink: 0 }}
        />
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

import { loadFont as loadSans } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { createContext, useContext } from "react";
import { Easing, interpolate } from "remotion";

export const SANS = loadSans("normal", { subsets: ["latin"], weights: ["300", "400", "500", "600"] }).fontFamily;
export const MONO = loadMono("normal", { subsets: ["latin"], weights: ["400", "500"] }).fontFamily;

export type Mode = "light" | "dark";
export type Locale = "en" | "es";
export interface FilmProps extends Record<string, unknown> {
    locale?: Locale;
    mode: Mode;
}

const light = {
    canvas: "#F5F5F4",
    bg: "#F1F0EA",
    surface: "#F7F6F0",
    fg: "#17150F",
    muted: "#6B6557",
    rule: "#DCD8CC",
    fill: "#E4E2DC",
    track: "#D6D4CE",
    tint: "#C2371B",
    tintWash: "rgba(194, 55, 27, 0.1)",
    income: "#00714A",
    spend: "#C0402E",
    chip: "#C6D8CC",
    card: "#FFFFFF",
    paper: "#FCFBF7",
    paperInk: "#2B2822",
    kraft: "#E6DBC2",
    shadow: "0 1px 1px rgba(60, 45, 20, 0.04), 0 18px 36px -18px rgba(70, 52, 25, 0.22), 0 48px 90px -48px rgba(70, 52, 25, 0.3)",
    lift: "0 2px 4px rgba(60, 45, 20, 0.05), 0 24px 48px -20px rgba(70, 52, 25, 0.3), 0 70px 120px -60px rgba(70, 52, 25, 0.35)",
    dropShadow: "drop-shadow(0 18px 24px rgba(70, 52, 25, 0.2))",
    edge: "rgba(23, 21, 15, 0.06)",
    rent: { bg: "#E4D3C5", ink: "#A0583A" },
    groceries: { bg: "#CFDBCA", ink: "#4E7D50" },
    utilities: { bg: "#DDD7C0", ink: "#7F6E26" },
};

const dark: typeof light = {
    canvas: "#1C1B13",
    bg: "#17150F",
    surface: "#2A251B",
    fg: "#F2EEE9",
    muted: "#A8A093",
    rule: "#353026",
    fill: "#262420",
    track: "#36352E",
    tint: "#EC603B",
    tintWash: "rgba(236, 96, 59, 0.15)",
    income: "#3FD99B",
    spend: "#E06A57",
    chip: "#23372A",
    card: "#24221B",
    paper: "#E4DFD3",
    paperInk: "#24211B",
    kraft: "#B9AC8E",
    shadow: "0 0 0 1px rgba(242, 238, 233, 0.05), 0 18px 36px -18px rgba(0, 0, 0, 0.55), 0 48px 90px -48px rgba(0, 0, 0, 0.7)",
    lift: "0 0 0 1px rgba(242, 238, 233, 0.06), 0 24px 48px -20px rgba(0, 0, 0, 0.6), 0 70px 120px -60px rgba(0, 0, 0, 0.8)",
    dropShadow: "drop-shadow(0 18px 24px rgba(0, 0, 0, 0.45))",
    edge: "rgba(242, 238, 233, 0.07)",
    rent: { bg: "#3B281A", ink: "#D4884F" },
    groceries: { bg: "#25311F", ink: "#5DAE68" },
    utilities: { bg: "#332E14", ink: "#C2A53A" },
};

type Palette = typeof light & { mode: Mode };

const PALETTES: Record<Mode, typeof light> = { dark, light };

export const paletteFor = (mode: Mode): Palette => ({ ...PALETTES[mode], mode });

export const ThemeContext = createContext<Palette>(paletteFor("light"));
export const useTheme = () => useContext(ThemeContext);

export const LocaleContext = createContext<Locale>("en");
export const useLocale = () => useContext(LocaleContext);

export const FLUID = Easing.bezier(0.32, 0.72, 0, 1);
export const GLIDE = Easing.bezier(0.65, 0, 0.35, 1);

export const ramp = (t: number, start: number, duration: number, easing = FLUID) =>
    interpolate(t, [start, start + duration], [0, 1], {
        easing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

export const band = (value: number, from: number, to: number) =>
    interpolate(value, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const wave = (t: number, period: number, phase = 0) => Math.sin((2 * Math.PI * t) / period + phase);

import { useMemo } from "react";
import { useCSSVariable } from "uniwind";

/** `global.css` is the only declaration of these; nothing here restates a value. */
const COLOR_VARIABLES = {
    accent: "--accent",
    accentForeground: "--accent-foreground",
    background: "--background",
    border: "--border",
    danger: "--danger",
    dangerOnWash: "--danger-on-wash",
    expense: "--expense",
    foreground: "--foreground",
    frMuted: "--fr-muted",
    future: "--future",
    groupedBackground: "--grouped-background",
    income: "--income",
    incomeOnWash: "--income-on-wash",
    muted: "--muted",
    overBudget: "--over-budget",
    primaryForeground: "--color-primary-foreground",
    /** An `rgba()`, not a hex: not safe for `withAlpha`. */
    railTrack: "--rail-track",
    separator: "--separator",
    subtle: "--subtle",
    surface: "--surface",
    surfaceSecondary: "--surface-secondary",
    tint: "--tint",
    transfer: "--transfer",
    warning: "--warning",
} as const;

type ColorName = keyof typeof COLOR_VARIABLES;

// SAFETY: `Object.keys` widens to string[]; these are that object's own keys.
const COLOR_NAMES = Object.keys(COLOR_VARIABLES) as ColorName[];
const COLOR_VARIABLE_NAMES = COLOR_NAMES.map((name) => COLOR_VARIABLES[name]);

export type ThemeColors = Record<ColorName, string>;

/** `#rrggbb` (uniwind resolves to hex on native), so safe for `withAlpha`. */
export function useColors(): ThemeColors {
    const values = useCSSVariable(COLOR_VARIABLE_NAMES);

    return useMemo(
        // SAFETY: `fromEntries` loses the key union; `values` is uniwind's read of the same names in the same order.
        () => Object.fromEntries(COLOR_NAMES.map((name, index) => [name, values[index] as string])) as ThemeColors,
        [values]
    );
}

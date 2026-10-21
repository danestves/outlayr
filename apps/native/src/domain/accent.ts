import type { TranslationKey } from "@/i18n/catalog";

/**
 * Settings calls this the Theme, but code says accent: uniwind and PanelUI already use `theme` for light/dark.
 * Each value clears 4.5:1 against every ground its theme paints; `token-contrast.test.ts` enforces it.
 */
export interface Accent {
    dark: string;
    key: AccentKey;
    label: TranslationKey;
    light: string;
    /** Stored in the `accentColor` setting. Append only; never renumber. */
    value: number;
}

type AccentKey = "vermilion" | "plum" | "ochre" | "prussian" | "pine";

/**
 * Ochre, prussian and pine sit darker than their nominal hue to clear contrast on `--surface-secondary`.
 */
export const ACCENTS: readonly Accent[] = [
    { dark: "#ec603b", key: "vermilion", label: "settings.theme.vermilion", light: "#c2371b", value: 0 },
    { dark: "#be68e1", key: "plum", label: "settings.theme.plum", light: "#9742b9", value: 1 },
    { dark: "#c57d00", key: "ochre", label: "settings.theme.ochre", light: "#965e00", value: 2 },
    { dark: "#0092e6", key: "prussian", label: "settings.theme.prussian", light: "#006fb0", value: 3 },
    { dark: "#00a15c", key: "pine", label: "settings.theme.pine", light: "#007b45", value: 4 },
];

export const [DEFAULT_ACCENT] = ACCENTS;

/**
 * Stored when an Android 12+ owner follows the wallpaper (`accent-options.android.ts`); must never collide with
 * `ACCENTS`. Other platforms read it as the default, like any unknown value.
 */
export const WALLPAPER_ACCENT_VALUE = 5;

export function accentForValue(value: number): Accent {
    return ACCENTS.find((accent) => accent.value === value) ?? DEFAULT_ACCENT;
}

export interface AccentVariables {
    "--color-ring": string;
    "--tint": string;
}

/**
 * The category ramp never re-anchors: its colours are stored per row, so rotating would repaint every category.
 */
export function accentVariables(accent: Accent, theme: "light" | "dark"): AccentVariables {
    const value = theme === "dark" ? accent.dark : accent.light;
    return { "--color-ring": value, "--tint": value };
}

/**
 * Stored in the `accentColor` setting. Append only; never renumber.
 * Ochre, prussian and pine sit darker than their nominal hue to clear contrast on the grounds both apps paint.
 */
export const ACCENT_PALETTE = [
    { dark: "#ec603b", key: "vermilion", light: "#c2371b", value: 0 },
    { dark: "#be68e1", key: "plum", light: "#9742b9", value: 1 },
    { dark: "#c57d00", key: "ochre", light: "#965e00", value: 2 },
    { dark: "#0092e6", key: "prussian", light: "#006fb0", value: 3 },
    { dark: "#00a15c", key: "pine", light: "#007b45", value: 4 },
] as const;

export type AccentColors = (typeof ACCENT_PALETTE)[number];

export type AccentKey = AccentColors["key"];

export const [DEFAULT_ACCENT_COLORS] = ACCENT_PALETTE;

/**
 * Stored when an Android 12+ owner follows the wallpaper; must never collide with `ACCENT_PALETTE`. Every other
 * platform reads it as the default, like any unknown value.
 */
export const WALLPAPER_ACCENT_VALUE = 5;

export const ON_ACCENT = { dark: "#17150f", light: "#ffffff" } as const;

export function accentColorsFor(value: number): AccentColors {
    return ACCENT_PALETTE.find((accent) => accent.value === value) ?? DEFAULT_ACCENT_COLORS;
}

export function accentOf(stored: string | null | undefined): AccentColors {
    return accentColorsFor(Number.parseInt(stored ?? "", 10));
}

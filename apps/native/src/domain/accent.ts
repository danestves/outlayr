import { ACCENT_PALETTE } from "@outlayr/money/accent";
import type { AccentColors } from "@outlayr/money/accent";

import type { TranslationKey } from "@/i18n/catalog";

export { WALLPAPER_ACCENT_VALUE } from "@outlayr/money/accent";

/**
 * Settings calls this the Theme, but code says accent: uniwind and PanelUI already use `theme` for light/dark.
 * Each value clears 4.5:1 against every ground its theme paints; `token-contrast.test.ts` enforces it.
 */
export type Accent = AccentColors & { label: TranslationKey };

export const ACCENTS: readonly Accent[] = ACCENT_PALETTE.map((accent) => ({
    ...accent,
    label: `settings.theme.${accent.key}` as const,
}));

export const [DEFAULT_ACCENT] = ACCENTS;

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

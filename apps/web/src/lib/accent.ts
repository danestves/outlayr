import { ON_ACCENT } from "@outlayr/money/accent";
import type { AccentColors } from "@outlayr/money/accent";

// The web paints the default accent with the site's dark tint, not the phone's.
const WEB_VERMILION_DARK = "#e2643f";

const tokens = (fill: string, on: string) => `--color-app-tint:${fill};--color-tint:${fill};--color-app-on-tint:${on}`;

export function accentCss({ dark, key, light }: AccentColors) {
    const fill = key === "vermilion" ? WEB_VERMILION_DARK : dark;
    return `:root{${tokens(light, ON_ACCENT.light)}}:root[data-theme=dark]{${tokens(fill, ON_ACCENT.dark)}}`;
}

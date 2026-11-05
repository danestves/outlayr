import { ON_ACCENT } from "@outlayr/money/accent";
import type { AccentColors } from "@outlayr/money/accent";

const tokens = (fill: string, on: string) => `--color-app-tint:${fill};--color-tint:${fill};--color-app-on-tint:${on}`;

export function accentCss({ dark, light }: AccentColors) {
    return `:root{${tokens(light, ON_ACCENT.light)}}:root[data-theme=dark]{${tokens(dark, ON_ACCENT.dark)}}`;
}

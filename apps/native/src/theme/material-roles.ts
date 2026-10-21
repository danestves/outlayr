import type { MaterialColors } from "@expo/ui/jetpack-compose";

/** A subset on purpose: the roles a screen paints with. */
export const MATERIAL_ROLE_VARIABLES = {
    error: "--m3-error",
    errorContainer: "--m3-error-container",
    inverseOnSurface: "--m3-inverse-on-surface",
    inverseSurface: "--m3-inverse-surface",
    onError: "--m3-on-error",
    onErrorContainer: "--m3-on-error-container",
    onPrimary: "--m3-on-primary",
    onPrimaryContainer: "--m3-on-primary-container",
    onSecondary: "--m3-on-secondary",
    onSecondaryContainer: "--m3-on-secondary-container",
    onSurface: "--m3-on-surface",
    onSurfaceVariant: "--m3-on-surface-variant",
    onTertiary: "--m3-on-tertiary",
    onTertiaryContainer: "--m3-on-tertiary-container",
    outline: "--m3-outline",
    outlineVariant: "--m3-outline-variant",
    primary: "--m3-primary",
    primaryContainer: "--m3-primary-container",
    scrim: "--m3-scrim",
    secondary: "--m3-secondary",
    secondaryContainer: "--m3-secondary-container",
    surface: "--m3-surface",
    surfaceContainer: "--m3-surface-container",
    surfaceContainerHigh: "--m3-surface-container-high",
    surfaceContainerHighest: "--m3-surface-container-highest",
    surfaceContainerLow: "--m3-surface-container-low",
    surfaceContainerLowest: "--m3-surface-container-lowest",
    tertiary: "--m3-tertiary",
    tertiaryContainer: "--m3-tertiary-container",
} as const satisfies Partial<Record<keyof MaterialColors, `--m3-${string}`>>;

export type MaterialRole = keyof typeof MATERIAL_ROLE_VARIABLES;

/** One `#rrggbb` per role, for one theme. */
export type MaterialRoleColors = Record<MaterialRole, string>;

// SAFETY: `Object.keys` widens to string[]; these are that object's own keys.
export const MATERIAL_ROLES = Object.keys(MATERIAL_ROLE_VARIABLES) as MaterialRole[];

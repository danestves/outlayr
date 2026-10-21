import type { TranslationKey } from "@/i18n/catalog";

import { ACCENTS, accentForValue, DEFAULT_ACCENT, WALLPAPER_ACCENT_VALUE } from "./accent";

export interface AccentOption {
    dark?: string;
    label: TranslationKey;
    light?: string;
    value: number;
}

// Wallpaper needs Android 12; below it the reserved value seeds from the default accent like any unknown one.
export function materialSeed(value: number, dynamicColor: boolean): string | undefined {
    if (value === WALLPAPER_ACCENT_VALUE && dynamicColor) {
        return undefined;
    }
    return accentForValue(value).light;
}

export function materialAccentOptions(dynamicColor: boolean): readonly AccentOption[] {
    if (!dynamicColor) {
        return ACCENTS;
    }
    return [{ label: "settings.theme.wallpaper", value: WALLPAPER_ACCENT_VALUE }, ...ACCENTS];
}

// `accentColor` syncs, so a device can receive a value its row has no option for, and the picker would show none.
export function offeredAccentValue(stored: number, options: readonly AccentOption[], fallback: number): number {
    return options.some((option) => option.value === stored) ? stored : fallback;
}

export function defaultMaterialAccentValue(dynamicColor: boolean): number {
    return dynamicColor ? WALLPAPER_ACCENT_VALUE : DEFAULT_ACCENT.value;
}

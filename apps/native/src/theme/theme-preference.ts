import type { TranslationKey } from "@/i18n/catalog";

export type ThemePreference = "light" | "dark" | "system";

/** `value` is what the `colorScheme` setting stores. Append only: renumbering changes every stored answer. */
export const THEME_OPTIONS: readonly {
    label: TranslationKey;
    detail: TranslationKey;
    preference: ThemePreference;
    value: number;
}[] = [
    {
        detail: "settings.colorScheme.systemDetail",
        label: "settings.colorScheme.system",
        preference: "system",
        value: 0,
    },
    {
        detail: "settings.colorScheme.lightDetail",
        label: "settings.colorScheme.light",
        preference: "light",
        value: 1,
    },
    {
        detail: "settings.colorScheme.darkDetail",
        label: "settings.colorScheme.dark",
        preference: "dark",
        value: 2,
    },
];

const [SYSTEM_OPTION] = THEME_OPTIONS;

/** Falls back to following the device: the value comes from storage. */
export function themePreferenceForValue(value: number): ThemePreference {
    return (THEME_OPTIONS.find((option) => option.value === value) ?? SYSTEM_OPTION).preference;
}

export function valueForThemePreference(preference: ThemePreference): number {
    return (THEME_OPTIONS.find((option) => option.preference === preference) ?? SYSTEM_OPTION).value;
}

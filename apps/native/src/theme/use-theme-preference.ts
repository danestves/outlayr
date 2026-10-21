import { useLayoutEffect } from "react";
import { Uniwind } from "uniwind";

import { useSettingNumber } from "@/contexts/display-settings-context";

import { themePreferenceForValue } from "./theme-preference";
import type { ThemePreference } from "./theme-preference";

/** Setting to uniwind, never back: uniwind holds the theme in memory only. Layout effect: no light first frame. */
export function useApplyThemePreference(): ThemePreference {
    const preference = themePreferenceForValue(useSettingNumber("colorScheme"));

    useLayoutEffect(() => {
        Uniwind.setTheme(preference);
    }, [preference]);

    return preference;
}

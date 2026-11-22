import { Uniwind } from "uniwind";

import { useSetting } from "@/contexts/display-settings-context";
import { useLayoutMirror } from "@/lib/lifecycle";

import { themePreferenceForValue } from "./theme-preference";
import type { ThemePreference } from "./theme-preference";

/** Setting to uniwind, never back: uniwind holds the theme in memory only. Layout effect: no light first frame. */
export function useApplyThemePreference(): ThemePreference {
    const preference = themePreferenceForValue(useSetting("colorScheme"));

    useLayoutMirror([preference], () => {
        Uniwind.setTheme(preference);
    });

    return preference;
}

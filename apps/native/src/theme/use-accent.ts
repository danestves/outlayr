import { useLayoutEffect } from "react";
import { Uniwind } from "uniwind";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { accentForValue, accentVariables } from "@/domain/accent";
import type { Accent } from "@/domain/accent";

/**
 * Per theme via `updateCSSVariables`, not a `@variant` per accent: uniwind follows the system scheme only for `light`
 * and `dark`. A layout effect, or a cold start paints one vermilion frame.
 */
export function useAccent(): Accent {
    const accent = accentForValue(useSettingNumber("accentColor"));

    useLayoutEffect(() => {
        // A fresh literal: an interface has no implicit index signature for `CSSVariables`.
        Uniwind.updateCSSVariables("light", { ...accentVariables(accent, "light") });
        Uniwind.updateCSSVariables("dark", { ...accentVariables(accent, "dark") });
    }, [accent]);

    return accent;
}

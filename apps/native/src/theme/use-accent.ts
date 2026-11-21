import { Uniwind } from "uniwind";

import { useSetting } from "@/contexts/display-settings-context";
import { accentForValue, accentVariables } from "@/domain/accent";
import type { Accent } from "@/domain/accent";
import { useLayoutMirror } from "@/lib/lifecycle";

/**
 * Per theme via `updateCSSVariables`, not a `@variant` per accent: uniwind follows the system scheme only for `light`
 * and `dark`. A layout effect, or a cold start paints one vermilion frame.
 */
export function useAccent(): Accent {
    const accent = accentForValue(useSetting("accentColor"));

    useLayoutMirror([accent], () => {
        // A fresh literal: an interface has no implicit index signature for `CSSVariables`.
        Uniwind.updateCSSVariables("light", { ...accentVariables(accent, "light") });
        Uniwind.updateCSSVariables("dark", { ...accentVariables(accent, "dark") });
    });

    return accent;
}

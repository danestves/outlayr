import { getMaterialColors, isDynamicColorAvailable } from "@expo/ui/jetpack-compose";
import { useLayoutEffect } from "react";
import { AppState } from "react-native";
import { Uniwind } from "uniwind";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { accentForValue } from "@/domain/accent";
import type { Accent } from "@/domain/accent";
import { materialSeed } from "@/domain/material-accent";

import { applyMaterialScheme } from "./material-revision";
import { MATERIAL_ROLES } from "./material-roles";
import type { MaterialRoleColors } from "./material-roles";
import { hexFromRgba, materialVariables } from "./material-scheme";
import type { MaterialTheme } from "./material-scheme";

const THEMES: readonly MaterialTheme[] = ["light", "dark"];

function composeScheme(theme: MaterialTheme, seedColor: string | undefined): MaterialRoleColors {
    const palette = getMaterialColors({ scheme: theme, seedColor });
    // SAFETY: `fromEntries` loses the key union; one entry per role.
    return Object.fromEntries(MATERIAL_ROLES.map((role) => [role, hexFromRgba(palette[role])])) as MaterialRoleColors;
}

/** Reads Compose's own scheme and writes both themes; re-reads on foreground, where a wallpaper change lands. */
export function useAccent(): Accent {
    const value = useSettingNumber("accentColor");
    const seedColor = materialSeed(value, isDynamicColorAvailable);

    useLayoutEffect(() => {
        const apply = () => {
            const schemes = THEMES.map((theme) => composeScheme(theme, seedColor));
            applyMaterialScheme(JSON.stringify(schemes), () => {
                for (const [index, theme] of THEMES.entries()) {
                    Uniwind.updateCSSVariables(theme, materialVariables(schemes[index], theme));
                }
            });
        };
        apply();
        const appState = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                apply();
            }
        });
        return () => {
            appState.remove();
        };
    }, [seedColor]);

    return accentForValue(value);
}

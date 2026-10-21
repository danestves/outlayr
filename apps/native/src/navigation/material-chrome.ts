import type { NativeStackNavigationOptions } from "expo-router";
import { useMemo } from "react";

import type { MaterialRoleColors } from "@/theme/material-roles";
import { useMaterialColors } from "@/theme/use-material-colors";

/**
 * Platform-neutral on purpose: a `.android.ts` file type-checks its imports against the plain sibling, so code two
 * Android files share has to live in a module with no platform twin.
 */

export const APP_BAR_TITLE_FONT = "GoogleSansFlex_400Regular";
export const APP_BAR_TITLE_SIZE = 22;

export const NAV_LABEL_FONT = "GoogleSansFlex_500Medium";
export const NAV_LABEL_SIZE = 12;

export const SHEET_CORNER_RADIUS = 28;
/** Drag handle (32x4) with Compose's 22dp above and below it. */
export const SHEET_HANDLE_BAND = 48;
export const SHEET_HEADER_ROW = 56;
export const SHEET_HEADER_HEIGHT = SHEET_HANDLE_BAND + SHEET_HEADER_ROW;

/** Opaque matters: a transparent header on Android drops the scrolling behaviour, so content starts under the bar. */
export function appBarOptions(m3: MaterialRoleColors): NativeStackNavigationOptions {
    return {
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: { backgroundColor: m3.surface },
        headerTintColor: m3.onSurface,
        headerTitleAlign: "left",
        headerTitleStyle: appBarTitleStyle(m3),
        headerTransparent: false,
    };
}

export function appBarTitleStyle(m3: MaterialRoleColors) {
    return { color: m3.onSurface, fontFamily: APP_BAR_TITLE_FONT, fontSize: APP_BAR_TITLE_SIZE };
}

export function useAppBarOptions(): NativeStackNavigationOptions {
    const m3 = useMaterialColors();
    return useMemo(() => appBarOptions(m3), [m3]);
}

import { Stack } from "expo-router";

import { appBarTitleStyle } from "@/navigation/material-chrome";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { ScreenHeaderProps } from "./screen-header";

// `large` is ignored: Android has no native large title. The title carries its own style because page-level options
// replace the layout's key by key, so a bare title resets `headerTitleStyle` to the system face.
export function ScreenHeader({ title }: ScreenHeaderProps) {
    const m3 = useMaterialColors();
    const barStyle = { backgroundColor: m3.surface, color: m3.onSurface, shadowColor: "transparent" as const };
    const titleStyle = appBarTitleStyle(m3);

    return (
        <>
            <Stack.Header style={barStyle} transparent={false} />
            {title === undefined ? null : <Stack.Screen.Title style={titleStyle}>{title}</Stack.Screen.Title>}
        </>
    );
}

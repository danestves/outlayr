import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useColors } from "@/theme/use-colors";

export function BandChrome() {
    const colors = useColors();
    return (
        <>
            <Stack.Screen
                options={{
                    headerBackImageSource: { uri: "nano_close" },
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.pro },
                    headerTintColor: colors.proForeground,
                    // The first-run step's header is transparent, and only iOS insets the scroll view under it.
                    headerTransparent: false,
                }}
            />
            <StatusBar style="dark" />
        </>
    );
}

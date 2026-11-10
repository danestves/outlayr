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
                }}
            />
            <StatusBar style="dark" />
        </>
    );
}

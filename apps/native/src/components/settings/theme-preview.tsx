import { View } from "react-native";

import type { ThemePreference } from "@/theme/theme-preference";

const PALETTES = {
    dark: { ground: "#1c1b17", ink: "#f4f1e8", soft: "#6f6a5c" },
    light: { ground: "#fbfaf6", ink: "#1c1b17", soft: "#c4bfb0" },
} as const;

function Page({ palette }: { palette: (typeof PALETTES)[keyof typeof PALETTES] }) {
    return (
        <View className="flex-1 justify-center gap-1.5 px-2.5" style={{ backgroundColor: palette.ground }}>
            <View className="h-1.5 w-8 rounded-full" style={{ backgroundColor: palette.ink }} />
            <View className="h-1 w-12 rounded-full" style={{ backgroundColor: palette.soft }} />
            <View className="h-1 w-6 rounded-full" style={{ backgroundColor: palette.soft }} />
        </View>
    );
}

export function ThemePreview({ preference }: { preference: ThemePreference }) {
    if (preference === "system") {
        return (
            <View className="flex-1 flex-row">
                <Page palette={PALETTES.light} />
                <Page palette={PALETTES.dark} />
            </View>
        );
    }
    return <Page palette={PALETTES[preference]} />;
}

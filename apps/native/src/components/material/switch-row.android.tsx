import { Switch } from "@expo/ui/jetpack-compose";
import { Pressable, View } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { SwitchRowProps } from "./switch-row";

export type { SwitchRowProps } from "./switch-row";

const PRESSED_ALPHA = 0.1;

// The Compose switch is hidden from TalkBack, so the whole-row switch is not announced twice.
export function SwitchRow({ label, value, onChange }: SwitchRowProps) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="min-h-14 flex-row items-center gap-4"
            onPress={() => onChange(!value)}
        >
            <Text className="text-body flex-1 font-sans" style={{ color: m3.onSurface }}>
                {label}
            </Text>
            <View importantForAccessibility="no-hide-descendants">
                <MaterialHost matchContents>
                    <Switch onCheckedChange={onChange} value={value} />
                </MaterialHost>
            </View>
        </Pressable>
    );
}

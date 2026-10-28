import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { settingsIcon } from "@/components/settings/settings-icons";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { ThemePreview } from "@/components/settings/theme-preview";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { themePreferenceForValue } from "@/theme/theme-preference";
import type { ThemePreference } from "@/theme/theme-preference";
import { useColors } from "@/theme/use-colors";

const ICONS = {
    dark: "Moon02",
    light: "Sun01",
    system: "ComputerPhoneSync",
} as const satisfies Record<ThemePreference, SettingsIconName>;

export interface ThemePickerProps {
    onChange: (value: number) => void;
    options: readonly { label: string; value: number }[];
    value: number;
}

export function ThemePicker({ onChange, options, value }: ThemePickerProps) {
    const colors = useColors();
    return (
        <View accessibilityRole="radiogroup" className="border-border flex-row gap-3 border-b py-3.5">
            {options.map((option) => {
                const preference = themePreferenceForValue(option.value);
                const selected = option.value === value;
                return (
                    <Pressable
                        accessibilityLabel={option.label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        className="flex-1 gap-2 active:opacity-60"
                        key={option.value}
                        onPress={() => onChange(option.value)}
                    >
                        <View
                            className={cn(
                                "h-14 overflow-hidden rounded-xl border-2",
                                selected ? "border-foreground" : "border-border"
                            )}
                        >
                            <ThemePreview preference={preference} />
                        </View>
                        <View className="flex-row items-center justify-center gap-1.5">
                            <HugeiconsIcon
                                color={selected ? colors.foreground : colors.muted}
                                icon={settingsIcon(ICONS[preference])}
                                size={16}
                                strokeWidth={1.9}
                            />
                            <Text
                                className={cn(
                                    "text-subtitle",
                                    selected ? "text-foreground font-sans-semibold" : "text-muted font-sans"
                                )}
                                numberOfLines={1}
                            >
                                {option.label}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

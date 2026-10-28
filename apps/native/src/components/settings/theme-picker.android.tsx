import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { settingsIcon } from "@/components/settings/settings-icons";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { ThemePreview } from "@/components/settings/theme-preview";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { themePreferenceForValue } from "@/theme/theme-preference";
import type { ThemePreference } from "@/theme/theme-preference";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { ThemePickerProps } from "./theme-picker";

export type { ThemePickerProps } from "./theme-picker";

const ICONS = {
    dark: "Moon02",
    light: "Sun01",
    system: "ComputerPhoneSync",
} as const satisfies Record<ThemePreference, SettingsIconName>;

export function ThemePicker({ onChange, options, value }: ThemePickerProps) {
    const m3 = useMaterialColors();
    return (
        <View accessibilityRole="radiogroup" className="border-m3-outline-variant flex-row gap-3 border-b py-3">
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
                                "h-16 overflow-hidden rounded-2xl border-2",
                                selected ? "border-m3-primary" : "border-m3-outline-variant"
                            )}
                        >
                            <ThemePreview preference={preference} />
                        </View>
                        <View className="flex-row items-center justify-center gap-1.5">
                            <HugeiconsIcon
                                color={selected ? m3.onSurface : m3.onSurfaceVariant}
                                icon={settingsIcon(ICONS[preference])}
                                size={18}
                                strokeWidth={1.6}
                            />
                            <Text
                                className={cn(
                                    "text-caption",
                                    selected
                                        ? "text-m3-on-surface font-sans-bold"
                                        : "text-m3-on-surface-variant font-sans"
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

import { Pressable, View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { monthDayRows, ordinalDay } from "@/data/settings-core";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage } from "@/i18n/context";

const LARGEST_DIGIT_SCALE = 2.5;

export interface MonthDayGridProps {
    onChange: (day: number) => void;
    value: number;
}

export interface MonthRowProps extends MonthDayGridProps {
    icon: SettingsIconName;
    note: string;
    title: string;
}

export function MonthDayGrid({ onChange, value }: MonthDayGridProps) {
    const { language } = useLanguage();
    const largeText = useAccessibilityTextSize();
    return (
        <View className="w-full">
            {monthDayRows(largeText ? 4 : 7).map((days) => (
                <View className={cn("flex-row", !largeText && "h-11")} key={days[0]}>
                    {days.map((day) => {
                        const selected = day === value;
                        const label = ordinalDay(day, language);
                        return (
                            <Pressable
                                accessibilityLabel={label}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                className={cn(
                                    "flex-1 items-center justify-center active:opacity-60",
                                    largeText && "aspect-square p-1"
                                )}
                                key={day}
                                onPress={() => onChange(day)}
                            >
                                <View
                                    className={cn(
                                        "items-center justify-center rounded-full",
                                        largeText ? "flex-1 self-stretch" : "size-[38px]",
                                        selected && "bg-foreground"
                                    )}
                                >
                                    <Text
                                        className={cn(
                                            "text-body tabular-nums",
                                            selected ? "text-background font-sans-bold" : "text-foreground"
                                        )}
                                        maxFontSizeMultiplier={LARGEST_DIGIT_SCALE}
                                    >
                                        {day}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

export function MonthRow({ icon, note, onChange, title, value }: MonthRowProps) {
    const { language } = useLanguage();
    return (
        <RowShell
            below={
                <View className="w-full pt-3">
                    <MonthDayGrid onChange={onChange} value={value} />
                </View>
            }
            detail={note}
            icon={icon}
            title={title}
        >
            <Text className="text-body text-muted tabular-nums">{ordinalDay(value, language)}</Text>
        </RowShell>
    );
}

import { Pressable, View } from "react-native";

import { ListItemFrame, ListItemIcon, ListItemText } from "@/components/list/material-list-item";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { MONTH_DAY_ROWS, ordinalDay } from "@/data/settings-core";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useLanguage } from "@/i18n/context";

import type { MonthDayGridProps, MonthRowProps } from "./month-day-grid";

export type { MonthDayGridProps, MonthRowProps } from "./month-day-grid";

export function MonthDayGrid({ onChange, value }: MonthDayGridProps) {
    const { language } = useLanguage();
    return (
        <View className="w-full">
            {MONTH_DAY_ROWS.map((days) => (
                <View className="h-11 flex-row" key={days[0]}>
                    {days.map((day) => {
                        const selected = day === value;
                        return (
                            <Pressable
                                accessibilityLabel={ordinalDay(day, language)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: selected }}
                                className="flex-1 items-center justify-center active:opacity-60"
                                key={day}
                                onPress={() => onChange(day)}
                            >
                                <View
                                    className={cn(
                                        "size-[38px] items-center justify-center rounded-full",
                                        selected && "bg-m3-primary"
                                    )}
                                >
                                    <Text
                                        className={cn(
                                            "text-body tabular-nums",
                                            selected ? "text-m3-on-primary font-sans-bold" : "text-m3-on-surface"
                                        )}
                                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
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
        <ListItemFrame>
            <View className="flex-1 gap-2 py-2">
                <View className="flex-row items-center gap-4">
                    <ListItemIcon icon={icon} />
                    <View className="flex-1">
                        <ListItemText title={title} />
                    </View>
                    <Text className="text-body text-m3-on-surface-variant tabular-nums">
                        {ordinalDay(value, language)}
                    </Text>
                </View>
                <MonthDayGrid onChange={onChange} value={value} />
                <Text className="text-caption text-m3-on-surface-variant leading-5">{note}</Text>
            </View>
        </ListItemFrame>
    );
}

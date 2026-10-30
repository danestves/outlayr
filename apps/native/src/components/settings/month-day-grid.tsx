import { Pressable, View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { MONTH_DAY_ROWS, ordinalDay } from "@/data/settings-core";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useLanguage } from "@/i18n/context";

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
    return (
        <View className="w-full">
            {MONTH_DAY_ROWS.map((days) => (
                <View className="h-11 flex-row" key={days[0]}>
                    {days.map((day) => {
                        const selected = day === value;
                        const label = ordinalDay(day, language);
                        return (
                            <Pressable
                                accessibilityLabel={label}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                className="flex-1 items-center justify-center active:opacity-60"
                                key={day}
                                onPress={() => onChange(day)}
                            >
                                <View
                                    className={cn(
                                        "size-[38px] items-center justify-center rounded-full",
                                        selected && "bg-foreground"
                                    )}
                                >
                                    <Text
                                        className={cn(
                                            "text-body tabular-nums",
                                            selected ? "text-background font-sans-bold" : "text-foreground"
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

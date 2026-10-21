import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { View } from "react-native";

import { Text } from "@/components/text";
import type { TimeOfDay } from "@/domain/reminder";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export interface ReminderTimeRowProps {
    onChange: (time: TimeOfDay) => void;
    value: TimeOfDay;
}

export function ReminderTimeRow({ onChange, value }: ReminderTimeRowProps) {
    const colors = useColors();
    const t = useTranslation();

    const pickerValue = new Date();
    pickerValue.setHours(value.hour, value.minute, 0, 0);

    return (
        <View className="border-border flex-row items-center justify-between border-b py-2">
            <Text className="text-body text-foreground">{t("settings.notifications.time")}</Text>
            <DateTimePicker
                accentColor={colors.tint}
                display="compact"
                mode="time"
                onValueChange={(_event, date) => {
                    onChange({
                        hour: date.getHours(),
                        minute: date.getMinutes(),
                    });
                }}
                value={pickerValue}
            />
        </View>
    );
}

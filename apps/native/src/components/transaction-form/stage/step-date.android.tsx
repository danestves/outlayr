import { DateTimePicker, TimePickerDialog } from "@expo/ui/jetpack-compose";
import Clock01Icon from "@hugeicons-pro/core-stroke-rounded/Clock01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatTime } from "@/domain/dates";
import { onUtcPickerDay, utcPickerDay } from "@/domain/local-day";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { StepDate as StepDateBase } from "./step-date";

const PRESSED_ALPHA = 0.1;

// M3's date picker without title or headline: a month row and a weekday row over six weeks, 48dp each.
const CALENDAR_HEIGHT = 392;

export const StepDate: typeof StepDateBase = ({ date, onChange, withTime = false }) => {
    const m3 = useMaterialColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    // Frozen: the calendar owns its selection once mounted, and a new initial date would rebuild it mid-gesture.
    const [initialDay] = useState(() => utcPickerDay(date));
    const [timeOpen, setTimeOpen] = useState(false);

    return (
        <View>
            <MaterialHost style={{ height: CALENDAR_HEIGHT, width: "100%" }}>
                <DateTimePicker
                    displayedComponents="date"
                    elementColors={{ containerColor: m3.surfaceContainer }}
                    initialDate={initialDay}
                    // Also fires once on mount with the initial day, which is not a change.
                    onDateSelected={(picked) => {
                        const next = onUtcPickerDay(picked, date);
                        if (next.getTime() !== date.getTime()) {
                            onChange(next);
                        }
                    }}
                    showHeadline={false}
                    showTitle={false}
                    showVariantToggle={false}
                    variant="picker"
                />
            </MaterialHost>

            {withTime ? (
                <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                    className="border-m3-outline-variant min-h-14 flex-row items-center gap-4 border-t px-2"
                    onPress={() => setTimeOpen(true)}
                >
                    <HugeiconsIcon color={m3.onSurfaceVariant} icon={Clock01Icon} size={24} />
                    <Text className="text-body text-m3-on-surface flex-1">{t("transaction.field.time")}</Text>
                    <Text className="text-body text-m3-primary font-sans-medium">
                        {formatTime(date, use24Hour, language)}
                    </Text>
                </Pressable>
            ) : null}

            {timeOpen ? (
                <MaterialHost matchContents>
                    <TimePickerDialog
                        confirmButtonLabel={t("common.done")}
                        dismissButtonLabel={t("common.cancel")}
                        initialDate={date.toISOString()}
                        is24Hour={use24Hour}
                        onDateSelected={(next) => {
                            setTimeOpen(false);
                            onChange(next);
                        }}
                        onDismissRequest={() => setTimeOpen(false)}
                    />
                </MaterialHost>
            ) : null}
        </View>
    );
};

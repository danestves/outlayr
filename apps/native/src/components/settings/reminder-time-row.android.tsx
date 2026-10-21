import { TimePickerDialog } from "@expo/ui/jetpack-compose";
import { useState } from "react";

import { MaterialListItem } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import type { ReminderTimeRowProps } from "@/components/settings/reminder-time-row";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatTimeOfDay } from "@/domain/reminder";
import { useLanguage, useTranslation } from "@/i18n/context";

export type { ReminderTimeRowProps } from "@/components/settings/reminder-time-row";

// Android's picker is a dialog that stays up while mounted, so it mounts only while open: mounted with the row it
// would trap the screen. `MaterialHost` gives it the app's scheme, not the handset's.
export function ReminderTimeRow({ onChange, value }: ReminderTimeRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const [open, setOpen] = useState(false);

    const pickerValue = new Date();
    pickerValue.setHours(value.hour, value.minute, 0, 0);

    return (
        <>
            <MaterialListItem
                accessibilityRole="button"
                onPress={() => setOpen(true)}
                supporting={[formatTimeOfDay(value, use24Hour, language)]}
                title={t("settings.notifications.time")}
            />
            {open ? (
                <MaterialHost>
                    <TimePickerDialog
                        initialDate={pickerValue.toISOString()}
                        is24Hour={use24Hour}
                        onDateSelected={(date) => {
                            setOpen(false);
                            onChange({
                                hour: date.getHours(),
                                minute: date.getMinutes(),
                            });
                        }}
                        onDismissRequest={() => setOpen(false)}
                    />
                </MaterialHost>
            ) : null}
        </>
    );
}

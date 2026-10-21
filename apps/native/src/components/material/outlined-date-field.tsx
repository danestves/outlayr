import { DatePickerDialog } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import type { ReactNode } from "react";
import { Keyboard } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { formatTargetDate } from "@/domain/dates";
import { useLanguage } from "@/i18n/context";

import { OutlinedSelectField } from "./outlined-field";

// Draws Compose, so import it only from `.android.tsx` files.

interface DateDialogProps {
    /** At `value`'s time of day. */
    onChange: (next: Date) => void;
    onDismiss: () => void;
    /** Inclusive; either end may be open. */
    range: { end?: Date; start?: Date };
    value: Date;
}

// Material 3's picker counts in UTC days.
function utcDay(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

function localDay(picked: Date, date: Date): Date {
    const next = new Date(date);
    next.setFullYear(picked.getUTCFullYear(), picked.getUTCMonth(), picked.getUTCDate());
    return next;
}

// Up for as long as it is mounted, so mount it only while open. `MaterialHost` gives it the app's scheme.
export function DateDialog({ onChange, onDismiss, range, value }: DateDialogProps) {
    return (
        <MaterialHost>
            <DatePickerDialog
                initialDate={utcDay(value)}
                onDateSelected={(picked) => onChange(localDay(picked, value))}
                onDismissRequest={onDismiss}
                selectableDates={range}
            />
        </MaterialHost>
    );
}

interface OutlinedDateFieldProps extends Omit<DateDialogProps, "onDismiss"> {
    label: string;
    onDismiss?: () => void;
    ground?: string;
    trailing?: ReactNode;
}

export function OutlinedDateField({
    label,
    onChange,
    onDismiss,
    range,
    value,
    ground,
    trailing,
}: OutlinedDateFieldProps) {
    const { language } = useLanguage();
    const [open, setOpen] = useState(false);
    const shown = formatTargetDate(value, language);
    return (
        <>
            <OutlinedSelectField
                accessibilityValue={shown}
                dropdown={false}
                ground={ground}
                label={label}
                onPress={() => {
                    Keyboard.dismiss();
                    setOpen(true);
                }}
                trailing={trailing}
                value={
                    <Text className="text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
                        {shown}
                    </Text>
                }
            />
            {open ? (
                <DateDialog
                    onChange={(next) => {
                        setOpen(false);
                        onChange(next);
                    }}
                    onDismiss={() => {
                        setOpen(false);
                        onDismiss?.();
                    }}
                    range={range}
                    value={value}
                />
            ) : null}
        </>
    );
}

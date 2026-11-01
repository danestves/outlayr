import { DatePickerDialog, TimePickerDialog } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import type { ReactNode } from "react";
import { Keyboard, View } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatTargetDate, formatTime } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";

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

function TimeDialog({ onChange, onDismiss, value }: Omit<DateDialogProps, "range">) {
    const t = useTranslation();
    const { use24Hour } = useDisplaySettings().state;
    return (
        <MaterialHost matchContents>
            <TimePickerDialog
                confirmButtonLabel={t("common.done")}
                dismissButtonLabel={t("common.cancel")}
                initialDate={value.toISOString()}
                is24Hour={use24Hour}
                onDateSelected={onChange}
                onDismissRequest={onDismiss}
            />
        </MaterialHost>
    );
}

function withinRange(date: Date, { end, start }: DateDialogProps["range"]): Date {
    const floor = start?.getTime() ?? Number.NEGATIVE_INFINITY;
    const ceiling = end?.getTime() ?? Number.POSITIVE_INFINITY;
    return new Date(Math.min(Math.max(date.getTime(), floor), ceiling));
}

interface OutlinedDateFieldProps extends Omit<DateDialogProps, "onDismiss"> {
    label: string;
    onDismiss?: () => void;
    ground?: string;
    trailing?: ReactNode;
    withTime?: boolean;
}

export function OutlinedDateField({
    label,
    onChange,
    onDismiss,
    range,
    value,
    ground,
    trailing,
    withTime = false,
}: OutlinedDateFieldProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const [open, setOpen] = useState<"date" | "time" | null>(null);
    const shown = formatTargetDate(value, language);
    const shownTime = formatTime(value, use24Hour, language);
    const settle = (next: Date) => (withTime ? withinRange(next, range) : next);
    const close = () => {
        setOpen(null);
        onDismiss?.();
    };
    const dateField = (
        <OutlinedSelectField
            accessibilityValue={shown}
            dropdown={false}
            ground={ground}
            label={label}
            onPress={() => {
                Keyboard.dismiss();
                setOpen("date");
            }}
            trailing={trailing}
            value={
                <Text className="text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
                    {shown}
                </Text>
            }
        />
    );
    return (
        <>
            {withTime ? (
                <View className="flex-row gap-3">
                    <View className="flex-1">{dateField}</View>
                    <View className="w-32">
                        <OutlinedSelectField
                            accessibilityValue={shownTime}
                            dropdown={false}
                            ground={ground}
                            label={t("transaction.field.time")}
                            onPress={() => {
                                Keyboard.dismiss();
                                setOpen("time");
                            }}
                            value={
                                <Text className="text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
                                    {shownTime}
                                </Text>
                            }
                        />
                    </View>
                </View>
            ) : (
                dateField
            )}
            {open === "date" ? (
                <DateDialog
                    onChange={(next) => {
                        setOpen(null);
                        onChange(settle(next));
                    }}
                    onDismiss={close}
                    range={range}
                    value={value}
                />
            ) : null}
            {open === "time" ? (
                <TimeDialog
                    onChange={(next) => {
                        setOpen(null);
                        onChange(settle(next));
                    }}
                    onDismiss={close}
                    value={value}
                />
            ) : null}
        </>
    );
}

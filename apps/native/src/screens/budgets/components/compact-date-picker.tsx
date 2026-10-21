import { DatePicker, Host, HStack, Spacer } from "@expo/ui/swift-ui";
import { datePickerStyle, environment, frame, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { useMemo } from "react";

import { useRegionCode } from "@/hooks/use-region-code";
import { useLanguage } from "@/i18n/context";

export interface CompactDatePickerProps {
    height?: number;
    /** For TalkBack; iOS's compact field reads its own value. */
    label: string;
    onChange: (next: Date) => void;
    onDismiss?: () => void;
    /** Inclusive; either end may be open. */
    range: { end?: Date; start?: Date };
    value: Date;
}

export function CompactDatePicker({ height = 40, onChange, range, value }: CompactDatePickerProps) {
    const locale = useDatePickerLocale();
    return (
        <Host style={{ height }}>
            <HStack modifiers={[frame({ maxHeight: Number.POSITIVE_INFINITY })]}>
                <DatePicker
                    displayedComponents={["date"]}
                    modifiers={[datePickerStyle("compact"), labelsHidden(), locale]}
                    onDateChange={onChange}
                    range={range}
                    selection={value}
                />
                <Spacer />
            </HStack>
        </Host>
    );
}

/** The app's language in the device's region: the field otherwise follows the system language. */
export function useDatePickerLocale() {
    const { language } = useLanguage();
    const region = useRegionCode();
    // @expo/ui drops an id missing from `Locale.availableIdentifiers`, which has no `en_VE`. Hermes resolves
    // against that list, so `en-VE` comes back as `en` and `en-GB` as itself.
    const id = useMemo(
        () => new Intl.DateTimeFormat(region ? `${language}-${region}` : language).resolvedOptions().locale,
        [language, region]
    );
    return environment({ key: "locale", value: id.replace("-", "_") });
}

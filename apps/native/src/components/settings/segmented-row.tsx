import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";

export interface SegmentedRowProps {
    icon: SettingsIconName;
    onChange: (value: number) => void;
    options: readonly { label: string; value: number }[];
    title: string;
    value: number;
}

export function SegmentedRow({ icon, onChange, options, title, value }: SegmentedRowProps) {
    const largeText = useAccessibilityTextSize();
    const picker = (
        <Host matchContents>
            <Picker
                label=""
                modifiers={[pickerStyle("segmented")]}
                onSelectionChange={(next) => {
                    const picked = options.find((option) => String(option.value) === next);
                    if (picked) {
                        onChange(picked.value);
                    }
                }}
                selection={String(value)}
            >
                {options.map((option) => (
                    <SwiftText key={option.value} modifiers={[tag(String(option.value))]}>
                        {option.label}
                    </SwiftText>
                ))}
            </Picker>
        </Host>
    );
    return largeText ? (
        <RowShell below={<View className="w-full pt-3">{picker}</View>} icon={icon} title={title} />
    ) : (
        <RowShell icon={icon} title={title} titleLines={2}>
            {picker}
        </RowShell>
    );
}

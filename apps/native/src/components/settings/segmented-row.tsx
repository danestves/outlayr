import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";

export interface SegmentedRowProps {
    icon: SettingsIconName;
    onChange: (value: number) => void;
    options: readonly { label: string; value: number }[];
    title: string;
    value: number;
}

export function SegmentedRow({ icon, onChange, options, title, value }: SegmentedRowProps) {
    return (
        <RowShell icon={icon} title={title}>
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
        </RowShell>
    );
}

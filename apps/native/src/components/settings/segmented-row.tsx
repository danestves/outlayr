import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";

export interface SegmentedRowProps {
    icon: SettingsIconName;
    onChange: (value: number) => void;
    /** The selected option's `note` shows under the row. */
    options: readonly { label: string; note?: string; value: number }[];
    title: string;
    value: number;
}

export function SegmentedRow({ icon, onChange, options, title, value }: SegmentedRowProps) {
    const largeText = useAccessibilityTextSize();
    // Sticky: once the pill moves below, the title gets the full width and fits, so re-measuring would flip it back.
    const [titleWraps, setTitleWraps] = useState(false);
    const note = options.find((option) => option.value === value)?.note;
    const stacked = largeText || titleWraps;
    const picker = (
        // Stacked, it takes the row's width; SwiftUI's segmented control stretches to whatever width it is offered.
        <Host matchContents={stacked ? { vertical: true } : true} style={stacked ? { width: "100%" } : undefined}>
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
    return stacked ? (
        <RowShell below={<View className="w-full pt-3">{picker}</View>} detail={note} flush icon={icon} title={title} />
    ) : (
        <RowShell
            detail={note}
            icon={icon}
            onTitleLines={(lines) => {
                if (lines > 1) {
                    setTitleWraps(true);
                }
            }}
            title={title}
            titleLines={2}
        >
            {picker}
        </RowShell>
    );
}

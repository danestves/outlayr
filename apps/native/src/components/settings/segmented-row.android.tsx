import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text as ComposeText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { View } from "react-native";

import { ListItemFrame, ListItemIcon, ListItemText } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";

import type { SegmentedRowProps } from "./segmented-row";

export type { SegmentedRowProps } from "./segmented-row";

const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;

export function SegmentedRow({ icon, onChange, options, title, value }: SegmentedRowProps) {
    const note = options.find((option) => option.value === value)?.note;
    return (
        <ListItemFrame>
            <View className="flex-1 gap-2 py-2">
                <View className="flex-row items-center gap-4">
                    <ListItemIcon icon={icon} />
                    <ListItemText title={title} />
                </View>
                <MaterialHost matchContents={{ vertical: true }}>
                    <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                        {options.map((option) => (
                            <SegmentedButton
                                key={option.value}
                                onClick={() => onChange(option.value)}
                                selected={option.value === value}
                            >
                                <SegmentedButton.Label>
                                    <ComposeText style={LABEL_FONT}>{option.label}</ComposeText>
                                </SegmentedButton.Label>
                            </SegmentedButton>
                        ))}
                    </SingleChoiceSegmentedButtonRow>
                </MaterialHost>
                {note ? <Text className="text-caption text-m3-on-surface-variant leading-5">{note}</Text> : null}
            </View>
        </ListItemFrame>
    );
}

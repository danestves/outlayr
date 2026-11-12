import { Switch } from "@expo/ui/jetpack-compose";
import { View } from "react-native";

import { ListItemFrame } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";

const LINE_BREAKS = /\s*\n\s*/g;

interface SourceRowProps {
    label: string;
    lines: number;
    on: boolean;
    onToggle: (on: boolean) => void;
    text: string;
}

export function SourceRow({ label, lines, on, onToggle, text }: SourceRowProps) {
    return (
        <ListItemFrame
            accessibilityLabel={label}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(!on)}
            twoLine
        >
            <View className="flex-1">
                <Text className="text-m3-on-surface text-body leading-6">{label}</Text>
                <Text className="text-m3-on-surface-variant text-caption leading-5" numberOfLines={lines}>
                    {text.replaceAll(LINE_BREAKS, " · ")}
                </Text>
            </View>
            <View importantForAccessibility="no-hide-descendants">
                <MaterialHost matchContents>
                    <Switch value={on} />
                </MaterialHost>
            </View>
        </ListItemFrame>
    );
}

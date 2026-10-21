import { Switch } from "@expo/ui/jetpack-compose";
import { Pressable, View } from "react-native";

import { MaterialHost } from "@/components/material-host";

import type { EditorSwitchProps } from "./editor-switch";

export type { EditorSwitchProps } from "./editor-switch";

/**
 * The wrapper is the one switch TalkBack reads and the one handler: a tap on the Compose switch reaches it, so a
 * handler on the switch itself would run the change twice.
 */
export function EditorSwitch({ accessibilityLabel, onValueChange, value }: EditorSwitchProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            hitSlop={8}
            onPress={() => onValueChange(!value)}
        >
            <View importantForAccessibility="no-hide-descendants">
                <MaterialHost matchContents>
                    <Switch value={value} />
                </MaterialHost>
            </View>
        </Pressable>
    );
}

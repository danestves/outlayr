import { Switch } from "react-native";

import { useColors } from "@/theme/use-colors";

export interface EditorSwitchProps {
    accessibilityLabel: string;
    onValueChange: (next: boolean) => void;
    value: boolean;
}

export function EditorSwitch({ accessibilityLabel, onValueChange, value }: EditorSwitchProps) {
    const colors = useColors();
    return (
        <Switch
            accessibilityLabel={accessibilityLabel}
            onValueChange={onValueChange}
            trackColor={{ false: colors.subtle, true: colors.income }}
            value={value}
        />
    );
}

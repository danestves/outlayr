import { RadioButton, Switch } from "@expo/ui/jetpack-compose";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

import { MaterialListItem } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { ChoiceRow as IosChoiceRow, LinkRow as IosLinkRow, ToggleRow as IosToggleRow } from "./list-row";

export { PickerRow } from "@/components/list/picker-row";

export function SettingsSection({ title, footer, children }: { title: string; footer?: string; children?: ReactNode }) {
    return (
        <View className="pt-5">
            <View className="pb-1">
                <MonoLabel accessibilityRole="header">{title}</MonoLabel>
            </View>
            <View>{children}</View>
            {footer ? <Text className="text-caption text-m3-on-surface-variant pt-2 leading-5">{footer}</Text> : null}
        </View>
    );
}

function Chevron() {
    const m3 = useMaterialColors();
    return <HugeiconsIcon color={m3.onSurfaceVariant} icon={ArrowRight01Icon} size={20} strokeWidth={1.8} />;
}

export function LinkRow({ icon, title, value, detail, destructive, onPress }: ComponentProps<typeof IosLinkRow>) {
    return (
        <MaterialListItem
            accessibilityRole="button"
            destructive={destructive}
            icon={icon}
            onPress={onPress}
            supporting={[value, detail]}
            title={title}
            trailing={onPress ? <Chevron /> : null}
        />
    );
}

/**
 * The switch has no handler: a tap on it also reaches the row's Pressable, and two handlers would run the
 * change twice (the app lock would ask for a fingerprint twice).
 */
export function ToggleRow({ icon, title, value, onValueChange, testID }: ComponentProps<typeof IosToggleRow>) {
    return (
        <MaterialListItem
            accessibilityLabel={title}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            icon={icon}
            onPress={() => onValueChange(!value)}
            testID={testID}
            title={title}
            trailing={
                <View importantForAccessibility="no-hide-descendants">
                    <MaterialHost matchContents>
                        <Switch value={value} />
                    </MaterialHost>
                </View>
            }
        />
    );
}

/** Like the switch, the radio has no handler: the row takes the tap. */
export function ChoiceRow({ label, detail, leading, selected, value, onPress }: ComponentProps<typeof IosChoiceRow>) {
    return (
        <MaterialListItem
            accessibilityLabel={[label, value, detail].filter(Boolean).join(", ")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            leading={
                <>
                    <View importantForAccessibility="no-hide-descendants">
                        <MaterialHost matchContents>
                            <RadioButton selected={selected} />
                        </MaterialHost>
                    </View>
                    {leading}
                </>
            }
            onPress={onPress}
            supporting={[value, detail]}
            title={label}
        />
    );
}

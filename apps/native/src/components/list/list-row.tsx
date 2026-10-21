import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import { MonoLabel } from "@/components/mono-label";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

export { PickerRow } from "@/components/list/picker-row";

export function SettingsSection({ title, footer, children }: { title: string; footer?: string; children?: ReactNode }) {
    return (
        <View className="pt-6">
            <View className="pb-1.5">
                <MonoLabel accessibilityRole="header">{title}</MonoLabel>
            </View>
            <View className="border-border border-t">{children}</View>
            {footer ? <Text className="text-muted text-subtitle pt-2 leading-snug">{footer}</Text> : null}
        </View>
    );
}

function Disclosure({ value }: { value?: string }) {
    const colors = useColors();
    return (
        <View className="flex-row items-center gap-1.5">
            {value ? (
                <Text className="text-body text-muted" numberOfLines={1}>
                    {value}
                </Text>
            ) : null}
            <HugeiconsIcon color={colors.subtle} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
        </View>
    );
}

function RowTrailing({ interactive, value }: { interactive: boolean; value?: string }) {
    if (interactive) {
        return <Disclosure value={value} />;
    }
    if (value) {
        return <Text className="text-body text-muted">{value}</Text>;
    }
    return null;
}

interface LinkRowProps {
    destructive?: boolean;
    detail?: string;
    icon?: SettingsIconName;
    onPress?: () => void;
    title: string;
    value?: string;
}

export function LinkRow({ icon, title, value, detail, destructive, onPress }: LinkRowProps) {
    const stacked = useAccessibilityTextSize() && Boolean(value);
    const body = (
        <RowShell
            below={stacked ? <Text className="text-body text-muted">{value}</Text> : undefined}
            destructive={destructive}
            detail={detail}
            icon={icon}
            title={title}
        >
            <RowTrailing interactive={onPress != null} value={stacked ? undefined : value} />
        </RowShell>
    );

    if (!onPress) {
        return body;
    }

    return (
        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onPress}>
            {body}
        </Pressable>
    );
}

export function ToggleRow({
    icon,
    title,
    value,
    onValueChange,
    testID,
}: {
    icon: SettingsIconName;
    title: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    testID?: string;
}) {
    const colors = useColors();
    return (
        <RowShell icon={icon} title={title}>
            <Switch
                accessibilityLabel={title}
                onValueChange={onValueChange}
                testID={testID}
                trackColor={{ false: colors.subtle, true: colors.tint }}
                value={value}
            />
        </RowShell>
    );
}

export function ChoiceRow({
    label,
    detail,
    leading,
    selected,
    value,
    onPress,
}: {
    label: string;
    detail?: string;
    leading?: ReactNode;
    selected: boolean;
    value?: string;
    onPress: () => void;
}) {
    const colors = useColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="border-border flex-row items-center gap-3 border-b py-3.5 active:opacity-60"
            onPress={onPress}
        >
            {leading}
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground">{label}</Text>
                {detail ? <Text className="text-muted text-subtitle leading-snug">{detail}</Text> : null}
            </View>
            {value ? <Text className="text-body text-muted tabular-nums">{value}</Text> : null}
            {selected ? <HugeiconsIcon color={colors.tint} icon={Tick02Icon} size={20} strokeWidth={2.4} /> : null}
        </Pressable>
    );
}

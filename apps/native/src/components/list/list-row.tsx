import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowUpRight01Icon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";

import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

export { PickerRow } from "@/components/list/picker-row";

export function SettingsSection({
    title,
    accessory,
    footer,
    footerLink,
    children,
}: {
    title?: string;
    accessory?: ReactNode;
    footer?: string;
    footerLink?: { label: string; onPress: () => void };
    children?: ReactNode;
}) {
    const colors = useColors();
    return (
        <View className="pt-8">
            {title ? (
                <>
                    <View className="flex-row items-end justify-between gap-3">
                        <Text
                            accessibilityRole="header"
                            className="text-title font-sans-bold text-foreground shrink tracking-tight"
                        >
                            {title}
                        </Text>
                        {accessory}
                    </View>
                    <View className="bg-foreground mt-1.5 h-[1.5px]" />
                </>
            ) : null}
            <View className={title ? undefined : "border-border border-t"}>{children}</View>
            {footer ? (
                <View className="pt-2">
                    <Text className="text-muted text-subtitle leading-snug">{footer}</Text>
                    {footerLink ? (
                        <Pressable
                            accessibilityRole="link"
                            className="flex-row items-center gap-1 self-start pt-3 active:opacity-60"
                            onPress={footerLink.onPress}
                        >
                            <Text className="text-tint text-subtitle font-sans-semibold">{footerLink.label}</Text>
                            <HugeiconsIcon color={colors.tint} icon={ArrowUpRight01Icon} size={14} strokeWidth={2.2} />
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

function Disclosure({ external, value }: { external?: boolean; value?: string }) {
    const colors = useColors();
    return (
        <View className="flex-row items-center gap-1.5">
            {value ? (
                <Text className="text-body text-muted" numberOfLines={1}>
                    {value}
                </Text>
            ) : null}
            <HugeiconsIcon
                color={colors.subtle}
                icon={external ? ArrowUpRight01Icon : ArrowRight01Icon}
                size={16}
                strokeWidth={2.2}
            />
        </View>
    );
}

function RowTrailing({ external, interactive, value }: { external?: boolean; interactive: boolean; value?: string }) {
    if (interactive) {
        return <Disclosure external={external} value={value} />;
    }
    if (value) {
        return <Text className="text-body text-muted">{value}</Text>;
    }
    return null;
}

interface LinkRowProps {
    destructive?: boolean;
    detail?: string;
    external?: boolean;
    icon?: SettingsIconName;
    noChevron?: boolean;
    onPress?: () => void;
    title: string;
    value?: string;
}

export function LinkRow({ icon, title, value, detail, destructive, external, noChevron, onPress }: LinkRowProps) {
    const stacked = useAccessibilityTextSize() && Boolean(value);
    const body = (
        <RowShell
            below={stacked ? <Text className="text-body text-muted">{value}</Text> : undefined}
            destructive={destructive}
            detail={detail}
            icon={icon}
            title={title}
        >
            <RowTrailing
                external={external}
                interactive={onPress != null && !noChevron}
                value={stacked ? undefined : value}
            />
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
    detail,
    value,
    onValueChange,
    testID,
}: {
    icon: SettingsIconName;
    title: string;
    detail?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    testID?: string;
}) {
    const colors = useColors();
    return (
        <RowShell detail={detail} icon={icon} title={title}>
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

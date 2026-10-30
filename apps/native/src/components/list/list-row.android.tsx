import { Icon, RadioButton, Switch } from "@expo/ui/jetpack-compose";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowUpRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, View } from "react-native";

import { MaterialListItem } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { ChoiceRow as IosChoiceRow, LinkRow as IosLinkRow, ToggleRow as IosToggleRow } from "./list-row";

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
    const m3 = useMaterialColors();
    return (
        <View className="pt-8">
            {title ? (
                <>
                    <View className="flex-row items-end justify-between gap-3">
                        <Text
                            accessibilityRole="header"
                            className="text-title font-sans-bold text-m3-on-surface shrink tracking-tight"
                        >
                            {title}
                        </Text>
                        {accessory}
                    </View>
                    <View className="bg-m3-on-surface mt-1.5 h-[1.5px]" />
                </>
            ) : null}
            <View>{children}</View>
            {footer ? (
                <View className="pt-2">
                    <Text className="text-caption text-m3-on-surface-variant leading-5">{footer}</Text>
                    {footerLink ? (
                        <Pressable
                            accessibilityRole="link"
                            className="flex-row items-center gap-1 self-start pt-3 active:opacity-60"
                            onPress={footerLink.onPress}
                        >
                            <Text className="text-caption text-m3-primary font-sans-semibold">{footerLink.label}</Text>
                            <HugeiconsIcon color={m3.primary} icon={ArrowUpRight01Icon} size={14} strokeWidth={2.2} />
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

function Trailing({ external, interactive, value }: { external?: boolean; interactive: boolean; value?: string }) {
    const m3 = useMaterialColors();
    if (!interactive && !value) {
        return null;
    }
    return (
        <View className="flex-row items-center gap-1">
            {value ? (
                <Text className="text-body text-m3-on-surface-variant" numberOfLines={1}>
                    {value}
                </Text>
            ) : null}
            {interactive ? (
                <HugeiconsIcon
                    color={m3.onSurfaceVariant}
                    icon={external ? ArrowUpRight01Icon : ArrowRight01Icon}
                    size={20}
                    strokeWidth={1.8}
                />
            ) : null}
        </View>
    );
}

export function LinkRow({
    icon,
    title,
    value,
    detail,
    destructive,
    external,
    noChevron,
    onPress,
}: ComponentProps<typeof IosLinkRow>) {
    return (
        <MaterialListItem
            accessibilityRole="button"
            destructive={destructive}
            icon={icon}
            onPress={onPress}
            supporting={[detail]}
            title={title}
            trailing={<Trailing external={external} interactive={onPress != null && !noChevron} value={value} />}
        />
    );
}

/**
 * The switch has no handler: a tap on it also reaches the row's Pressable, and two handlers would run the
 * change twice (the app lock would ask for a fingerprint twice).
 */
export function ToggleRow({ icon, title, detail, value, onValueChange, testID }: ComponentProps<typeof IosToggleRow>) {
    return (
        <MaterialListItem
            accessibilityLabel={title}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            icon={icon}
            onPress={() => onValueChange(!value)}
            supporting={[detail]}
            testID={testID}
            title={title}
            trailing={
                <View importantForAccessibility="no-hide-descendants">
                    <MaterialHost matchContents>
                        <Switch value={value}>
                            {value ? (
                                <Switch.ThumbContent>
                                    <Icon size={Switch.DefaultIconSize} source={{ uri: "nano_done" }} />
                                </Switch.ThumbContent>
                            ) : null}
                        </Switch>
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

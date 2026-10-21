import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { AccessibilityRole, AccessibilityState } from "react-native";

import type { SettingsIconName } from "@/components/settings/settings-icons";
import { settingsIcon } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

/**
 * Android only, but a plain filename: a `.android.tsx` file type-checks its imports against the plain sibling,
 * so pieces several Android siblings share need a module with no platform twin.
 */

const ICON_SIZE = 24;
const NO_LINES: readonly string[] = [];

interface ListItemFrameProps {
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: AccessibilityState;
    children: ReactNode;
    onPress?: () => void;
    testID?: string;
    twoLine?: boolean;
}

/** Bleeds over `SettingsScreen`'s 16dp gutter so the ripple runs edge to edge; inert without `onPress`. */
export function ListItemFrame({
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    onPress,
    testID,
    twoLine = false,
}: ListItemFrameProps) {
    const m3 = useMaterialColors();
    const content = (
        <View
            className={cn(
                "border-m3-outline-variant flex-row items-center gap-4 border-b py-2",
                twoLine ? "min-h-18" : "min-h-14"
            )}
        >
            {children}
        </View>
    );

    if (!onPress) {
        return (
            <View className="-mx-4 px-4" testID={testID}>
                {content}
            </View>
        );
    }
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            accessibilityState={accessibilityState}
            // The pressed state layer: M3's 10% of `onSurface`.
            android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
            className="-mx-4 px-4"
            onPress={onPress}
            testID={testID}
        >
            {content}
        </Pressable>
    );
}

export function ListItemIcon({ icon, destructive = false }: { destructive?: boolean; icon: SettingsIconName }) {
    const m3 = useMaterialColors();
    return (
        <HugeiconsIcon
            color={destructive ? m3.error : m3.onSurfaceVariant}
            icon={settingsIcon(icon)}
            size={ICON_SIZE}
            strokeWidth={1.6}
        />
    );
}

interface ListItemTextProps {
    attention?: boolean;
    destructive?: boolean;
    /** Empty entries are dropped. */
    supporting?: readonly (string | null | undefined)[];
    title: string;
}

export function ListItemText({
    attention = false,
    destructive = false,
    supporting = NO_LINES,
    title,
}: ListItemTextProps) {
    const lines = supporting.filter((line): line is string => Boolean(line));
    return (
        <View>
            <Text className={cn("text-body leading-6", destructive ? "text-m3-error" : "text-m3-on-surface")}>
                {title}
            </Text>
            {lines.map((line, index) => (
                <Text
                    className={cn(
                        "text-caption leading-5",
                        attention && index === 0 ? "text-m3-error" : "text-m3-on-surface-variant"
                    )}
                    // oxlint-disable-next-line react/no-array-index-key -- the lines are positional
                    key={index}
                >
                    {line}
                </Text>
            ))}
        </View>
    );
}

interface MaterialListItemProps extends Omit<ListItemFrameProps, "children" | "twoLine"> {
    destructive?: boolean;
    icon?: SettingsIconName;
    leading?: ReactNode;
    supporting?: readonly (string | null | undefined)[];
    title: string;
    trailing?: ReactNode;
}

export function MaterialListItem({
    destructive,
    icon,
    leading,
    supporting = NO_LINES,
    title,
    trailing,
    ...frame
}: MaterialListItemProps) {
    return (
        <ListItemFrame {...frame} twoLine={supporting.some(Boolean)}>
            {leading}
            {icon ? <ListItemIcon destructive={destructive} icon={icon} /> : null}
            <View className="flex-1">
                <ListItemText destructive={destructive} supporting={supporting} title={title} />
            </View>
            {trailing}
        </ListItemFrame>
    );
}

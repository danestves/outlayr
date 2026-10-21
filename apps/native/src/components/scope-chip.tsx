import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import Cancel01Icon from "@hugeicons-pro/core-solid-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { Text } from "./text";

interface ScopeChipProps {
    accessibilityLabel?: string;
    actions?: MenuAction[];
    clearAccessibilityLabel?: string;
    menuTitle?: string;
    onAction?: (id: string) => void;
    onClear?: () => void;
    title: string;
}

export function ScopeChip({
    title,
    actions,
    onAction,
    onClear,
    menuTitle,
    accessibilityLabel,
    clearAccessibilityLabel,
}: ScopeChipProps) {
    const colors = useColors();
    const t = useTranslation();
    const hasMenu = actions != null && actions.length > 0 && onAction != null;

    const label = (
        <View className="flex-row items-center gap-1.25">
            <Text className="font-sans-semibold text-foreground text-subtitle" numberOfLines={1}>
                {title}
            </Text>
            {hasMenu ? <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={10} /> : null}
        </View>
    );

    return (
        // `shrink-0` so a chip alone on a wrapping row keeps its natural width.
        <View
            accessibilityLabel={accessibilityLabel}
            className="bg-surface-secondary shrink-0 flex-row items-center gap-2.25 rounded-full px-3 py-1.5"
        >
            {hasMenu ? (
                <MenuView
                    actions={actions}
                    onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}
                    shouldOpenOnLongPress={false}
                    title={menuTitle}
                >
                    {label}
                </MenuView>
            ) : (
                label
            )}
            {onClear ? (
                <Pressable
                    accessibilityLabel={clearAccessibilityLabel ?? t("log.scope.clear")}
                    accessibilityRole="button"
                    className="py-1 active:opacity-60"
                    hitSlop={12}
                    onPress={onClear}
                >
                    <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={11} />
                </Pressable>
            ) : null}
        </View>
    );
}

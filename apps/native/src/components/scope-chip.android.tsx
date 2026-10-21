import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { MaterialMenu } from "./material-menu";
import type { ScopeChip as ScopeChipBase } from "./scope-chip";
import { Text } from "./text";
import { cn } from "./tw";

const ICON_SIZE = 18;
const PRESSED_ALPHA = 0.1;
/** The chip's corner, less its 1dp outline where it has one. */
const OUTLINED_LAYER = { borderRadius: 7 } as const;
const SELECTED_LAYER = { borderBottomLeftRadius: 8, borderTopLeftRadius: 8 } as const;

// Draws at 32dp, but the label and the X each take a 48dp touch area (the X by a frame given back as negative
// margin). Nothing here clips, so those areas can reach past the chip.
export const ScopeChip: typeof ScopeChipBase = ({
    title,
    actions,
    onAction,
    onClear,
    accessibilityLabel,
    clearAccessibilityLabel,
}) => {
    const m3 = useMaterialColors();
    const t = useTranslation();
    const selected = onClear != null;
    const hasMenu = actions != null && actions.length > 0 && onAction != null;
    const ink = selected ? m3.onSecondaryContainer : m3.onSurfaceVariant;
    const menuPadding = hasMenu ? "pr-2" : "pr-4";

    const label = (pressed: boolean) => (
        <View className={cn("h-8 flex-row items-center gap-2 pl-4", selected ? "pr-1" : menuPadding)}>
            {pressed ? (
                <View
                    className="absolute inset-0"
                    pointerEvents="none"
                    style={[
                        selected ? SELECTED_LAYER : OUTLINED_LAYER,
                        { backgroundColor: withAlpha(ink, PRESSED_ALPHA) },
                    ]}
                />
            ) : null}
            <Text
                className={cn(
                    "font-sans-medium text-caption leading-5",
                    selected ? "text-m3-on-secondary-container" : "text-m3-on-surface-variant"
                )}
                numberOfLines={1}
            >
                {title}
            </Text>
            {hasMenu ? <HugeiconsIcon color={ink} icon={ArrowDown01Icon} size={ICON_SIZE} /> : null}
        </View>
    );

    return (
        <View
            className={cn(
                "h-8 shrink-0 flex-row items-center rounded-lg",
                selected ? "bg-m3-secondary-container" : "border-m3-outline border"
            )}
        >
            {hasMenu ? (
                <MaterialMenu
                    accessibilityLabel={accessibilityLabel}
                    accessibilityValue={{ text: title }}
                    actions={actions}
                    onPressAction={onAction}
                    renderTrigger={({ pressed }) => label(pressed)}
                />
            ) : (
                <View accessibilityLabel={accessibilityLabel} accessibilityValue={{ text: title }} accessible>
                    {label(false)}
                </View>
            )}
            {onClear ? (
                <Pressable
                    accessibilityLabel={clearAccessibilityLabel ?? t("log.scope.clear")}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: withAlpha(ink, PRESSED_ALPHA), radius: 16 }}
                    className="-m-2 size-12 items-center justify-center"
                    onPress={onClear}
                >
                    <HugeiconsIcon color={ink} icon={Cancel01Icon} size={ICON_SIZE} />
                </Pressable>
            ) : null}
        </View>
    );
};

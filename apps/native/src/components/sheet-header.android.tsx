import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { SheetHeaderIconButtonProps, SheetHeaderProps, SheetHeaderTextButtonProps } from "./sheet-header";

const ICON_SIZE = 24;
const ICON_STROKE = 1.8;
const STATE_LAYER_RADIUS = 20;
const PRESSED_ALPHA = 0.1;
const HANDLE_ALPHA = 0.4;
const DISABLED_ALPHA = 0.38;
const TEXT_BUTTON_SLOP = { bottom: 4, top: 4 } as const;

// The geometry is `SHEET_HEADER_HEIGHT` in `navigation/material-chrome.ts`; keep the two in step.
export function SheetHeader({ title, onClose, children }: SheetHeaderProps) {
    const router = useRouter();
    const t = useTranslation();
    const m3 = useMaterialColors();

    return (
        <View className="bg-m3-surface-container-low">
            {/* Decorative: the whole sheet drags, and TalkBack closes it with the button below. */}
            <View className="h-12 items-center justify-center" importantForAccessibility="no-hide-descendants">
                <View
                    className="h-1 w-8 rounded-full"
                    style={{ backgroundColor: withAlpha(m3.onSurfaceVariant, HANDLE_ALPHA) }}
                />
            </View>
            <View className="h-14 flex-row items-center px-1">
                <IconButton
                    accessibilityLabel={t("common.close")}
                    color={m3.onSurface}
                    icon={Cancel01Icon}
                    onPress={onClose ?? (() => router.back())}
                />
                {/* No title, no heading: an empty one is still a TalkBack stop. */}
                {title === undefined ? (
                    <View className="flex-1" />
                ) : (
                    <Text
                        accessibilityRole="header"
                        className="text-m3-on-surface flex-1 pl-1 text-[22px] leading-7"
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                )}
                {children}
            </View>
        </View>
    );
}

export function SheetHeaderTextButton({ label, onPress, disabled = false }: SheetHeaderTextButtonProps) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            android_ripple={{ color: withAlpha(m3.primary, PRESSED_ALPHA) }}
            className="mx-2 h-10 justify-center overflow-hidden rounded-full px-3"
            disabled={disabled}
            hitSlop={TEXT_BUTTON_SLOP}
            onPress={onPress}
        >
            <Text
                className="font-sans-medium text-caption"
                style={{ color: disabled ? withAlpha(m3.onSurface, DISABLED_ALPHA) : m3.primary }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function SheetHeaderIconButton({
    icon,
    accessibilityLabel,
    onPress,
    disabled = false,
    destructive = false,
}: SheetHeaderIconButtonProps) {
    const m3 = useMaterialColors();
    return (
        <IconButton
            accessibilityLabel={accessibilityLabel}
            color={destructive ? m3.error : m3.onSurfaceVariant}
            disabled={disabled}
            icon={icon}
            onPress={onPress}
        />
    );
}

function IconButton({
    icon,
    color,
    accessibilityLabel,
    onPress,
    disabled = false,
}: {
    icon: IconSvgElement;
    color: string;
    accessibilityLabel: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            android_ripple={{
                borderless: true,
                color: withAlpha(m3.onSurface, PRESSED_ALPHA),
                radius: STATE_LAYER_RADIUS,
            }}
            className="size-12 items-center justify-center"
            disabled={disabled}
            onPress={onPress}
        >
            <HugeiconsIcon
                color={disabled ? withAlpha(m3.onSurface, DISABLED_ALPHA) : color}
                icon={icon}
                size={ICON_SIZE}
                strokeWidth={ICON_STROKE}
            />
        </Pressable>
    );
}

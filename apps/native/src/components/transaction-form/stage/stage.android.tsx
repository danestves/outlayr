import ArrowLeft01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { createContext, use } from "react";
import { Pressable, View } from "react-native";
import Animated, { Keyframe, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FontScaleCapContext, Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { EASE } from "../../sentence/sentence-motion";
import type {
    StageAction,
    StagePartContext as StagePartContextBase,
    TransactionStage as TransactionStageBase,
} from "./stage";
import { useKeyboardShown } from "./use-keyboard-shown";
import { useStageBack } from "./use-stage-back";

const SWAP_MS = 240;

const LABEL_MS = 160;

const SLIDE = 8;

const BOTTOM_PAD = 24;

// Lifted over the keyboard there is no gesture bar to clear.
const KEYBOARD_BOTTOM_PAD = 12;

const ICON_SIZE = 24;

const PRESSED_ALPHA = 0.1;

const DISABLED_CONTAINER_ALPHA = 0.12;
const DISABLED_CONTENT_ALPHA = 0.38;

const STAGE_FONT_SCALE_CAP = 1.35;

const LARGE_TEXT_STAGE_FONT_SCALE_CAP = 2;

export const StagePartContext: typeof StagePartContextBase = createContext<"inline" | "pinned" | null>(null);

// See `stage.tsx`: no `exiting` partner, so the surface never holds two bodies.
function stageBodyEntering(forward: boolean) {
    return new Keyframe({
        0: { opacity: 0, transform: [{ translateX: forward ? SLIDE : -SLIDE }] },
        100: { easing: EASE, opacity: 1, transform: [{ translateX: 0 }] },
    })
        .duration(SWAP_MS)
        .reduceMotion(ReduceMotion.System);
}

const FOOTER_LABEL_ENTERING = new Keyframe({
    0: { opacity: 0 },
    100: { easing: EASE, opacity: 1 },
})
    .duration(LABEL_MS)
    .reduceMotion(ReduceMotion.System);

function StageRightMeta({ action, node }: { action?: StageAction; node?: ReactNode }) {
    const m3 = useMaterialColors();
    if (action) {
        return (
            <Pressable
                accessibilityRole="button"
                android_ripple={{ color: withAlpha(m3.primary, PRESSED_ALPHA) }}
                className="ml-auto h-10 justify-center overflow-hidden rounded-full px-3"
                onPress={action.onPress}
            >
                <Text className="font-sans-medium text-caption text-m3-primary">{action.label}</Text>
            </Pressable>
        );
    }
    if (node == null) {
        return null;
    }
    return <View className="ml-auto">{node}</View>;
}

export const TransactionStage: typeof TransactionStageBase = ({
    backLabel,
    children,
    footer,
    forward = true,
    onBack,
    right,
    rightAction,
    stepKey,
    title,
}) => {
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();
    const keyboardShown = useKeyboardShown();
    const part = use(StagePartContext);
    const largeText = useAccessibilityTextSize();
    const fontScaleCap = largeText ? LARGE_TEXT_STAGE_FONT_SCALE_CAP : STAGE_FONT_SCALE_CAP;
    const buttonOnly = part === "pinned" && largeText;
    const inline = part === "inline";
    const ready = (footer?.tone ?? "primary") === "primary";
    // The part that draws the back button owns the press: at large text the pinned part is only the footer.
    useStageBack(buttonOnly ? undefined : onBack);
    const bottomPad = { paddingBottom: keyboardShown ? KEYBOARD_BOTTOM_PAD : BOTTOM_PAD + insets.bottom };

    const button =
        footer && !keyboardShown ? (
            <Pressable
                accessibilityLabel={footer.label}
                accessibilityRole="button"
                android_ripple={{ color: withAlpha(ready ? m3.onPrimary : m3.onSurface, PRESSED_ALPHA) }}
                className={cn(
                    "min-h-14 items-center justify-center overflow-hidden rounded-full px-6 py-2",
                    buttonOnly ? null : "mt-4"
                )}
                onPress={footer.onPress}
                style={{ backgroundColor: ready ? m3.primary : withAlpha(m3.onSurface, DISABLED_CONTAINER_ALPHA) }}
                testID="stage-footer"
            >
                <Animated.View entering={FOOTER_LABEL_ENTERING} key={footer.label}>
                    <Text
                        className="font-sans-medium text-body text-center"
                        style={{ color: ready ? m3.onPrimary : withAlpha(m3.onSurface, DISABLED_CONTENT_ALPHA) }}
                    >
                        {footer.label}
                    </Text>
                </Animated.View>
            </Pressable>
        ) : null;

    if (buttonOnly) {
        return button === null ? null : (
            <FontScaleCapContext value={fontScaleCap}>
                <View className="bg-m3-surface-container rounded-t-[28px] px-4 pt-3" style={bottomPad}>
                    {button}
                </View>
            </FontScaleCapContext>
        );
    }

    return (
        <FontScaleCapContext value={fontScaleCap}>
            <View
                className={cn("pt-[15px]", inline ? null : "bg-m3-surface-container rounded-t-[28px] px-4")}
                style={inline ? undefined : bottomPad}
            >
                {/* Centred on the panel, not after the back button, so it sits in the same place on every step. */}
                <View className={cn(largeText ? "min-h-12" : "h-12", "flex-row items-center")}>
                    {onBack ? (
                        <Pressable
                            accessibilityLabel={backLabel}
                            accessibilityRole="button"
                            android_ripple={{
                                borderless: true,
                                color: withAlpha(m3.onSurface, PRESSED_ALPHA),
                                radius: ICON_SIZE - 4,
                            }}
                            className="-ml-3 size-12 items-center justify-center"
                            onPress={onBack}
                        >
                            <HugeiconsIcon color={m3.onSurfaceVariant} icon={ArrowLeft01Icon} size={ICON_SIZE} />
                        </Pressable>
                    ) : null}
                    {title == null ? null : (
                        <View className="absolute right-0 left-0 items-center" pointerEvents="none">
                            <Text className="font-sans-medium text-body text-m3-on-surface">{title}</Text>
                        </View>
                    )}
                    <StageRightMeta action={rightAction} node={right} />
                </View>

                <Animated.View className="pt-3" entering={stageBodyEntering(forward)} key={stepKey} testID="stage-body">
                    {children}
                </Animated.View>

                {inline ? null : button}
            </View>
        </FontScaleCapContext>
    );
};

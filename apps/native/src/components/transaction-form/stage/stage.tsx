import ArrowLeft01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { createContext, use } from "react";
import { Pressable, View } from "react-native";
import Animated, { Keyframe, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassButton } from "@/components/glass-button";
import { FontScaleCapContext, Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

import { EASE } from "../../sentence/sentence-motion";
import { useKeyboardShown } from "./use-keyboard-shown";

const SWAP_MS = 240;

const LABEL_MS = 160;

const SLIDE = 8;

const BOTTOM_PAD = 30;

// The keyboard covers the home indicator, so reserving its inset would only push the footer under the keyboard.
const KEYBOARD_BOTTOM_PAD = 12;

const BACK_GLYPH = 19;

const STAGE_FONT_SCALE_CAP = 1.35;

const LARGE_TEXT_STAGE_FONT_SCALE_CAP = 2;

export const StagePartContext = createContext<"inline" | "pinned" | null>(null);

// No `exiting` on purpose: Reanimated keeps an exiting view mounted, so a bottom-pinned stage would hold both
// bodies' heights for the fade and jump when the old one leaves.
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

// `muted` is never `disabled`: a press that cannot save still has to say what is missing.
type StageTone = "muted" | "primary";

const FOOTER_FILL = {
    muted: "bg-surface-secondary",
    primary: "bg-tint",
} as const satisfies Record<StageTone, string>;

// Not a literal white: `src/theme/token-contrast.test.ts` enumerates those per file.
const FOOTER_INK = {
    muted: "text-muted",
    primary: "text-accent-foreground",
} as const satisfies Record<StageTone, string>;

export interface StageAction {
    label: string;
    onPress: () => void;
}

export type StageFooter = StageAction & { tone?: StageTone };

interface StageContentProps {
    children: ReactNode;
    footer?: StageFooter;
    forward?: boolean;
    right?: ReactNode;
    rightAction?: StageAction;
    stepKey: string;
    title?: string;
}

type StageBackProps = { backLabel: string; onBack: () => void } | { backLabel?: never; onBack?: never };

export type TransactionStageProps = StageBackProps & StageContentProps;

function StageRightMeta({ action, node }: { action?: StageAction; node?: ReactNode }) {
    if (action) {
        return (
            <View className="ml-auto">
                <GlassButton
                    accessibilityLabel={action.label}
                    className="min-h-[38px] rounded-full px-4"
                    onPress={action.onPress}
                >
                    <Text className="font-sans-semibold text-subtitle text-tint">{action.label}</Text>
                </GlassButton>
            </View>
        );
    }
    if (node == null) {
        return null;
    }
    return <View className="ml-auto">{node}</View>;
}

// Nothing is presented over the form: a native sheet over the `transactions/create` modal insets it and drops it
// from the accessibility tree.
export function TransactionStage({
    backLabel,
    children,
    footer,
    forward = true,
    onBack,
    right,
    rightAction,
    stepKey,
    title,
}: TransactionStageProps) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const keyboardShown = useKeyboardShown();
    const part = use(StagePartContext);
    const largeText = useAccessibilityTextSize();
    const fontScaleCap = largeText ? LARGE_TEXT_STAGE_FONT_SCALE_CAP : STAGE_FONT_SCALE_CAP;
    const buttonOnly = part === "pinned" && largeText;
    const inline = part === "inline";
    const tone = footer?.tone ?? "primary";
    const bottomPad = { paddingBottom: keyboardShown ? KEYBOARD_BOTTOM_PAD : Math.max(BOTTOM_PAD, insets.bottom) };

    const button =
        footer && !keyboardShown ? (
            <Pressable
                accessibilityLabel={footer.label}
                accessibilityRole="button"
                className={cn(
                    "min-h-[48px] items-center justify-center rounded-[14px] px-4 py-2 active:opacity-80",
                    buttonOnly ? null : "mt-4",
                    FOOTER_FILL[tone]
                )}
                onPress={footer.onPress}
                testID="stage-footer"
            >
                <Animated.View entering={FOOTER_LABEL_ENTERING} key={footer.label}>
                    <Text className={cn("font-sans-semibold text-callout text-center", FOOTER_INK[tone])}>
                        {footer.label}
                    </Text>
                </Animated.View>
            </Pressable>
        ) : null;

    if (buttonOnly) {
        return button === null ? null : (
            <FontScaleCapContext value={fontScaleCap}>
                <View className="border-separator bg-background border-t px-5 pt-3" style={bottomPad}>
                    {button}
                </View>
            </FontScaleCapContext>
        );
    }

    return (
        <FontScaleCapContext value={fontScaleCap}>
            <View
                className={cn("border-separator border-t pt-[15px]", inline ? null : "bg-background px-5")}
                style={inline ? undefined : bottomPad}
            >
                {/* Absolute, so the title holds the centre line whatever controls the step has on either side. */}
                <View className={cn(largeText ? "min-h-[38px]" : "h-[38px]", "flex-row items-center")}>
                    {onBack ? (
                        <GlassButton
                            accessibilityLabel={backLabel}
                            className="h-[38px] w-[38px] rounded-full"
                            onPress={onBack}
                        >
                            <HugeiconsIcon color={colors.foreground} icon={ArrowLeft01Icon} size={BACK_GLYPH} />
                        </GlassButton>
                    ) : null}
                    {title == null ? null : (
                        <View className="absolute right-0 left-0 items-center" pointerEvents="none">
                            <Text className="font-sans-semibold text-foreground text-callout">{title}</Text>
                        </View>
                    )}
                    <StageRightMeta action={rightAction} node={right} />
                </View>

                {/* pt-3 keeps a keypad from reading as one block with the header above it. */}
                <Animated.View className="pt-3" entering={stageBodyEntering(forward)} key={stepKey} testID="stage-body">
                    {children}
                </Animated.View>

                {inline ? null : button}
            </View>
        </FontScaleCapContext>
    );
}

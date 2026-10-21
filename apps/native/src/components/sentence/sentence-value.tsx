import { useEffect } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { currencySymbol, symbolPrefix } from "@/domain/money";
import { useColors } from "@/theme/use-colors";

import { FlowAmount } from "../amount-text";
import { Text } from "../text";
import { cn } from "../tw";
import { useSentenceStyle } from "./sentence";
import { SENTENCE_DRAW, valueEntering } from "./sentence-motion";
import { SentenceWash } from "./sentence-wash";
import { useSentenceShake } from "./use-sentence-shake";

// Measured against SF Pro Rounded, not derived: clears the 26pt face's descenders inside the 38pt line box.
const RULE_BOTTOM = 7;

export interface SentenceFigure {
    amount: number;
    code: string;
}

interface SentenceValueProps {
    accessibilityLabel: string;
    active?: boolean;
    children?: ReactNode;
    figure?: SentenceFigure;
    flagged?: boolean;
    onPress: () => void;
    pending?: boolean;
    ruleBottom?: number;
    shake?: boolean;
    /** The fact's identity, not its text: the amount passes a constant so it updates in place instead of per digit. */
    swapKey?: string;
    value: string;
}

// The rule animates `scaleX`, not width: a width relayouts every later word per frame, and inside `RNHostView`
// that re-measures the whole SwiftUI form.
export function SentenceValue({
    accessibilityLabel,
    active,
    children,
    figure,
    flagged,
    onPress,
    pending,
    ruleBottom = RULE_BOTTOM,
    shake,
    swapKey,
    value,
}: SentenceValueProps) {
    const { textClassName } = useSentenceStyle();
    const colors = useColors();
    const reduced = useReducedMotion();
    const draw = useSharedValue(reduced ? 1 : 0);
    const shakeStyle = useSentenceShake(shake);
    const identity = swapKey ?? value;

    useEffect(() => {
        if (reduced) {
            draw.set(1);
            return;
        }
        draw.set(0);
        draw.set(withTiming(1, SENTENCE_DRAW));
    }, [draw, identity, reduced]);

    const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: draw.get() }] }));

    const tone = () => {
        if (flagged) {
            return "text-danger";
        }
        if (active) {
            return "text-foreground";
        }
        return pending ? "text-muted" : "text-foreground";
    };

    return (
        <Animated.View style={shakeStyle}>
            <Pressable
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ busy: pending }}
                accessibilityValue={{ text: value }}
                onPress={onPress}
            >
                <SentenceWash active={active} />
                <Animated.View className="flex-row items-baseline gap-1.5" entering={valueEntering()} key={identity}>
                    {children}
                    {figure ? (
                        <FlowAmount
                            amount={figure.amount}
                            className={cn(textClassName, tone())}
                            code={figure.code}
                            prefix={symbolPrefix(currencySymbol(figure.code))}
                            showCents
                            still
                        />
                    ) : (
                        <Text className={cn(textClassName, tone())}>{value}</Text>
                    )}
                </Animated.View>
                <Animated.View
                    className="absolute right-0 left-0 h-[2px] rounded-full"
                    pointerEvents="none"
                    style={[
                        {
                            backgroundColor: flagged ? colors.danger : colors.tint,
                            bottom: ruleBottom,
                            transformOrigin: "left",
                        },
                        ruleStyle,
                    ]}
                />
            </Pressable>
        </Animated.View>
    );
}

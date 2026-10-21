import type { ReactNode } from "react";
import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/text";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const SELECT = { duration: 180 } as const;

const SELECTED_ALPHA = 0.13;

// 38pt pill against a 44pt minimum; horizontal slop stays inside `StageOptionRow`'s 8pt gap so targets never overlap.
const HIT_SLOP = { bottom: 3, left: 4, right: 4, top: 3 } as const;

export interface StageOptionProps {
    accessibilityLabel?: string;
    label: string;
    leading?: ReactNode;
    onPress: () => void;
    selected?: boolean;
    trailing?: ReactNode;
}

// Only colour animates: inside a SwiftUI `RNHostView`, a size change re-measures the whole tree.
export function StageOption({
    accessibilityLabel,
    label,
    leading,
    onPress,
    selected = false,
    trailing,
}: StageOptionProps) {
    const colors = useColors();
    const reduced = useReducedMotion();
    const on = useSharedValue(selected ? 1 : 0);

    // Mixed outside the worklet: `withAlpha` is not one and crashes on the UI thread. The rest fill is vermilion at
    // zero alpha, so the wash never travels through grey.
    const restFill = withAlpha(colors.tint, 0);
    const selectedFill = withAlpha(colors.tint, SELECTED_ALPHA);
    const { separator, tint } = colors;

    useEffect(() => {
        const next = selected ? 1 : 0;
        on.set(reduced ? next : withTiming(next, SELECT));
    }, [on, reduced, selected]);

    const fill = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(on.get(), [0, 1], [restFill, selectedFill]),
        borderColor: interpolateColor(on.get(), [0, 1], [separator, tint]),
    }));

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={HIT_SLOP}
            onPress={onPress}
        >
            <Animated.View
                className="min-h-[38px] flex-row items-center gap-2 rounded-[19px] border px-3.5 py-1.5"
                style={fill}
            >
                {leading}
                <Text className="text-foreground text-subtitle">{label}</Text>
                {trailing}
            </Animated.View>
        </Pressable>
    );
}

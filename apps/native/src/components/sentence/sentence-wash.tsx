import { useEffect } from "react";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { SENTENCE_WASH } from "./sentence-motion";

const BLEED = 5;

// Measured against SF Pro Rounded at 26pt: trims the 38pt line box so the wash hugs the glyphs.
const LEAD_TOP = 5;
const LEAD_BOTTOM = 2;

const ALPHA = 0.13;

const RADIUS = 7;

interface SentenceWashProps {
    active?: boolean;
}

// An absolute bleed, not padding, and only `opacity` animates: a width change makes `RNHostView` re-measure the
// whole SwiftUI form. Not `bg-tint/13`: uniwind compiles that to an invalid `color-mix` rejected at runtime.
export function SentenceWash({ active }: SentenceWashProps) {
    const colors = useColors();
    const reduced = useReducedMotion();
    const shown = useSharedValue(active ? 1 : 0);

    useEffect(() => {
        const next = active ? 1 : 0;
        shown.set(reduced ? next : withTiming(next, SENTENCE_WASH));
    }, [active, reduced, shown]);

    const washStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    backgroundColor: withAlpha(colors.tint, ALPHA),
                    borderRadius: RADIUS,
                    bottom: LEAD_BOTTOM,
                    left: -BLEED,
                    position: "absolute",
                    right: -BLEED,
                    top: LEAD_TOP,
                },
                washStyle,
            ]}
        />
    );
}

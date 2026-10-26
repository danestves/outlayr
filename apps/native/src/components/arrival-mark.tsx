import { useIsFocused } from "expo-router";
import Animated, {
    Easing,
    useAnimatedReaction,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useColors } from "@/theme/use-colors";

const DRAW = { duration: 220, easing: Easing.out(Easing.cubic) };
const HOLD_MS = 900;
const FADE = { duration: 420, easing: Easing.in(Easing.quad) };

function arrivalModeOf(reduced: boolean, focused: boolean): "play" | "settle" | "wait" {
    "worklet";
    if (reduced) {
        return "settle";
    }
    return focused ? "play" : "wait";
}

export function ArrivalMark({ onSettled }: { onSettled: () => void }) {
    const colors = useColors();
    const focused = useIsFocused();
    const reduced = useReducedMotion();
    const drawn = useSharedValue(0);
    const opacity = useSharedValue(1);
    const started = useSharedValue(false);

    useAnimatedReaction(
        () => arrivalModeOf(reduced, focused),
        (mode) => {
            if (mode === "settle") {
                scheduleOnRN(onSettled);
                return;
            }
            if (mode === "wait" || started.get()) {
                return;
            }
            started.set(true);
            drawn.set(withTiming(1, DRAW));
            opacity.set(
                withSequence(
                    withTiming(1, { duration: DRAW.duration }),
                    withDelay(
                        HOLD_MS,
                        withTiming(0, FADE, (finished) => {
                            if (finished) {
                                scheduleOnRN(onSettled);
                            }
                        })
                    )
                )
            );
        }
    );

    const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scaleY: drawn.get() }] }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    backgroundColor: colors.tint,
                    borderRadius: 2,
                    bottom: 10,
                    left: -12,
                    position: "absolute",
                    top: 10,
                    width: 3,
                },
                style,
            ]}
        />
    );
}

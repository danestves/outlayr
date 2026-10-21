import { useEffect } from "react";
import { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

// The app's shake, leg for leg: see `screens/budgets/components/budget-form.tsx`.
const LEG = { duration: 45 } as const;

export function useSentenceShake(shake: boolean | undefined) {
    const reduced = useReducedMotion();
    const offset = useSharedValue(0);

    useEffect(() => {
        if (!shake || reduced) {
            return;
        }
        offset.set(withSequence(withTiming(-8, LEG), withTiming(8, LEG), withTiming(-6, LEG), withTiming(0, LEG)));
    }, [offset, reduced, shake]);

    return useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
}

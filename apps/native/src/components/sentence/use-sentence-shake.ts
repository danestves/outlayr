import {
    useAnimatedReaction,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";

// The app's shake, leg for leg: see `screens/budgets/components/budget-form.tsx`.
const LEG = { duration: 45 } as const;

export function useSentenceShake(shake: boolean | undefined) {
    const reduced = useReducedMotion();
    const offset = useSharedValue(0);

    useAnimatedReaction(
        () => Boolean(shake) && !reduced,
        (go, previous) => {
            if (go && !previous) {
                offset.set(
                    withSequence(withTiming(-8, LEG), withTiming(8, LEG), withTiming(-6, LEG), withTiming(0, LEG))
                );
            }
        }
    );

    return useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
}

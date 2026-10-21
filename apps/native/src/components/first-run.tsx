import type { ReactNode } from "react";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

import { MonoLabel } from "./mono-label";
import { Text } from "./text";

const EASE = Easing.bezier(0.19, 1, 0.22, 1);
const FADE_MS = 200;

const RING_SIZES = [220, 340, 480, 640] as const;
const RING_OPACITY = [1, 0.72, 0.48, 0.28] as const;
const RING_STAGGER_MS = 70;

const ENTRANCE = {
    cover: { dock: 400, object: 0, rings: 100, text: 220 },
    step: { dock: 160, object: 0, rings: 0, text: 60 },
} as const;

function useRise(active: boolean, delayMs: number, distance = 6) {
    const reduced = useReducedMotion();
    const progress = useSharedValue(active ? 0 : 1);

    useEffect(() => {
        if (!active) {
            return;
        }
        progress.set(
            withDelay(reduced ? 0 : delayMs, withTiming(1, { duration: reduced ? FADE_MS : 480, easing: EASE }))
        );
    }, [active, delayMs, reduced, progress]);

    return useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ translateY: reduced ? 0 : (1 - progress.get()) * distance }],
    }));
}

function Ring({ size, targetOpacity, delayMs }: { size: number; targetOpacity: number; delayMs: number }) {
    const reduced = useReducedMotion();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(
            withDelay(reduced ? 0 : delayMs, withTiming(1, { duration: reduced ? FADE_MS : 600, easing: EASE }))
        );
    }, [delayMs, reduced, progress]);

    const style = useAnimatedStyle(() => ({
        opacity: progress.get() * targetOpacity,
        transform: [{ scale: reduced ? 1 : 0.85 + progress.get() * 0.15 }],
    }));

    return (
        <Animated.View
            className="border-fr-rule absolute rounded-full border"
            style={[{ borderRadius: size / 2, height: size, width: size }, style]}
        />
    );
}

function Rings({ delayMs }: { delayMs: number }) {
    return (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            {RING_SIZES.map((size, index) => (
                <Ring
                    delayMs={delayMs + index * RING_STAGGER_MS}
                    key={size}
                    size={size}
                    targetOpacity={RING_OPACITY[index] ?? 1}
                />
            ))}
        </View>
    );
}

function StageObject({ children, cover }: { children: ReactNode; cover: boolean }) {
    const reduced = useReducedMotion();
    const progress = useSharedValue(0);

    useEffect(() => {
        const arrivalMs = cover ? 480 : 380;
        progress.set(
            withTiming(1, {
                duration: reduced ? FADE_MS : arrivalMs,
                easing: EASE,
            })
        );
    }, [cover, reduced, progress]);

    const style = useAnimatedStyle(() => {
        if (reduced) {
            return { opacity: progress.get() };
        }
        const scale = cover ? 0.92 + progress.get() * 0.08 : 1.05 - progress.get() * 0.05;
        return {
            opacity: progress.get(),
            transform: [{ scale }, { translateY: cover ? (1 - progress.get()) * 6 : 0 }],
        };
    });

    return <Animated.View style={style}>{children}</Animated.View>;
}

interface FirstRunAction {
    disabled?: boolean;
    label: string;
    onPress: () => void;
}

interface FirstRunSkip {
    label: string;
    onPress: () => void;
}

interface FirstRunProps {
    action?: FirstRunAction;
    body?: string;
    children?: ReactNode;
    cover?: boolean;
    /** Rendered in reserved space, so an appearing error never shifts the buttons under the thumb. */
    error?: string | null;
    eyebrow?: string;
    footnote?: ReactNode;
    /** Without one, the head sits at the top and `children` fill the space. */
    object?: ReactNode;
    skip?: FirstRunSkip;
    title: string;
}

export function FirstRun({
    object,
    cover = false,
    eyebrow,
    title,
    body,
    children,
    action,
    skip,
    footnote,
    error,
}: FirstRunProps) {
    const timing = cover ? ENTRANCE.cover : ENTRANCE.step;
    const textStyle = useRise(object !== undefined, timing.text);
    const dockStyle = useRise(object !== undefined, timing.dock, 0);

    return (
        // One top offset for every screen: the steps carry a transparent OS header (44pt, 64dp on Android), and the
        // cover and the gate match it so the stage does not jump between them.
        <View className="bg-fr-ground pt-safe-offset-14 android:pt-safe-offset-19 pb-safe-offset-5 flex-1 px-6">
            {object === undefined ? (
                <>
                    <View className="gap-2">
                        {eyebrow ? <MonoLabel className="text-fr-muted">{eyebrow}</MonoLabel> : null}
                        <Text className="font-sans-semibold text-fr-ink text-title">{title}</Text>
                        {body ? <Text className="text-fr-muted text-subtitle leading-snug">{body}</Text> : null}
                    </View>
                    <View className="flex-1 justify-center">{children}</View>
                </>
            ) : (
                <>
                    <View className="flex-1 items-center justify-center">
                        <Rings delayMs={timing.rings} />
                        <StageObject cover={cover}>{object}</StageObject>
                    </View>
                    <Animated.View className="items-center gap-2.5" style={textStyle}>
                        {eyebrow ? <MonoLabel className="text-fr-vermilion text-center">{eyebrow}</MonoLabel> : null}
                        <Text className="font-sans-semibold text-fr-ink text-center text-[28px] leading-[33px] tracking-[-0.5px]">
                            {title}
                        </Text>
                        {body ? (
                            <Text className="text-fr-muted text-subtitle max-w-72 text-center leading-snug">
                                {body}
                            </Text>
                        ) : null}
                    </Animated.View>
                    {children ? (
                        <Animated.View className="pt-5" style={dockStyle}>
                            {children}
                        </Animated.View>
                    ) : null}
                </>
            )}

            {action ? (
                <Animated.View className="pt-5" style={object === undefined ? null : dockStyle}>
                    <Pressable
                        accessibilityRole="button"
                        className="bg-fr-ink items-center rounded-full px-7 py-3.5 active:opacity-80 disabled:opacity-50"
                        disabled={action.disabled}
                        onPress={action.onPress}
                    >
                        <Text className="font-sans-semibold text-body text-fr-ground">{action.label}</Text>
                    </Pressable>
                </Animated.View>
            ) : null}

            {skip ? (
                <Pressable accessibilityRole="button" onPress={skip.onPress}>
                    <Text className="font-sans-medium text-fr-muted text-subtitle pt-3 text-center">{skip.label}</Text>
                </Pressable>
            ) : null}

            {footnote ? <Text className="text-footnote text-fr-muted pt-3 text-center">{footnote}</Text> : null}

            {error === undefined ? null : (
                <View className="min-h-9 justify-start pt-2">
                    {error ? (
                        <Text
                            accessibilityLiveRegion="polite"
                            className="text-danger text-subtitle text-center leading-snug"
                            role="alert"
                        >
                            {error}
                        </Text>
                    ) : null}
                </View>
            )}
        </View>
    );
}

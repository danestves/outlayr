import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
    createAnimatedComponent,
    Easing,
    FadeOut,
    useAnimatedProps,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useMirror, useTimers, useWhen } from "@/lib/lifecycle";
import { useColors } from "@/theme/use-colors";
import { useIsDark } from "@/theme/use-is-dark";

import { calloutLayout, holeRect, POINTER_HEIGHT, POINTER_WIDTH, SCREEN_MARGIN } from "./callout-layout";
import { stepsFor } from "./steps";
import { useTour } from "./tour-context";
import type { TourStage } from "./tour-context";

const POINTER_DOWN = `M0 0 L${POINTER_WIDTH} 0 L${POINTER_WIDTH / 2} ${POINTER_HEIGHT} Z`;
const POINTER_UP = `M0 ${POINTER_HEIGHT} L${POINTER_WIDTH} ${POINTER_HEIGHT} L${POINTER_WIDTH / 2} 0 Z`;
// A dark screen under a light-mode dim barely changes, so dark mode dims harder.
const SCRIM_OPACITY = { dark: 0.6, light: 0.35 } as const;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const OPEN = { duration: 220, easing: EASE_OUT } as const;
// Short, since the Modal keeps taking taps until it is gone.
const CLOSE = { duration: 140, easing: EASE_OUT } as const;
const GLIDE = { duration: 360, easing: EASE_IN_OUT } as const;
const BUBBLE_IN = { duration: 240, easing: EASE_OUT } as const;
// A first stop's bubble lands as the dim settles; later stops wait out the glide,
// so the pointer never chases the cutout.
const BUBBLE_DELAY_MS = 160;
const BUBBLE_EXIT_MS = 120;
const BUBBLE_DRIFT = 8;
const BUBBLE_START_SCALE = 0.96;

const AnimatedPath = createAnimatedComponent(Path);
const AnimatedRect = createAnimatedComponent(Rect);

const styles = StyleSheet.create({
    bubble:
        Platform.OS === "android"
            ? {
                  borderRadius: 22,
                  elevation: 8,
                  paddingBottom: 12,
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  position: "absolute",
              }
            : {
                  borderRadius: 22,
                  paddingBottom: 12,
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  position: "absolute",
                  shadowColor: "#000000",
                  shadowOffset: { height: 4, width: 0 },
                  shadowOpacity: 0.16,
                  shadowRadius: 16,
              },
});

export function TourOverlay() {
    const { complete, skip, stage } = useTour();
    const { height, width } = useWindowDimensions();
    const colors = useColors();
    const isDark = useIsDark();
    const reduced = useReducedMotion();
    // The last stage stays drawn while the overlay fades out after Done, Skip or Got it.
    const [leaving, setLeaving] = useState<TourStage | null>(null);
    const shown = stage ?? leaving;
    const hole = shown ? holeRect(shown.rect, shown.radius) : null;

    const presence = useSharedValue(0);
    const hx = useSharedValue(0);
    const hy = useSharedValue(0);
    const hw = useSharedValue(0);
    const hh = useSharedValue(0);
    const hr = useSharedValue(0);

    useMirror([stage], () => {
        if (stage) {
            setLeaving(stage);
            presence.set(withTiming(1, OPEN));
            return;
        }
        presence.set(
            withTiming(0, CLOSE, (finished) => {
                if (finished) {
                    scheduleOnRN(setLeaving, null);
                }
            })
        );
    });

    useMirror([hole?.x, hole?.y, hole?.width, hole?.height, hole?.radius], () => {
        if (!hole) {
            return;
        }
        // Opening places the cutout; only a step change glides it from the last target.
        const glide = !reduced && presence.get() > 0;
        const to = (value: number) => (glide ? withTiming(value, GLIDE) : value);
        hx.set(to(hole.x));
        hy.set(to(hole.y));
        hw.set(to(hole.width));
        hh.set(to(hole.height));
        hr.set(to(hole.radius));
    });

    // One even-odd path rather than an SVG mask, which does not repaint when a shape inside it animates.
    const scrimProps = useAnimatedProps(() => {
        const x = hx.get();
        const y = hy.get();
        const w = hw.get();
        const h = hh.get();
        const r = Math.min(hr.get(), w / 2, h / 2);
        return {
            d:
                `M0 0 H${width} V${height} H0 Z ` +
                `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} ` +
                `A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
                `V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`,
        };
    });
    const ringProps = useAnimatedProps(() => ({
        height: hh.get(),
        rx: hr.get(),
        width: hw.get(),
        x: hx.get(),
        y: hy.get(),
    }));
    const fadeStyle = useAnimatedStyle(() => ({ opacity: presence.get() }));

    return (
        <Modal
            // Our own fade instead of the Modal's: a fading Modal kept taking taps until it finished.
            animationType="none"
            navigationBarTranslucent
            onRequestClose={shown?.tour === "log" ? skip : complete}
            statusBarTranslucent
            transparent
            visible={shown !== null}
        >
            <Animated.View pointerEvents={stage ? "auto" : "none"} style={[{ flex: 1 }, fadeStyle]}>
                {shown && hole ? (
                    <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
                        <AnimatedPath
                            animatedProps={scrimProps}
                            fill="#000000"
                            fillOpacity={isDark ? SCRIM_OPACITY.dark : SCRIM_OPACITY.light}
                            fillRule="evenodd"
                        />
                        <AnimatedRect
                            animatedProps={ringProps}
                            fill="none"
                            stroke={isDark ? colors.foreground : colors.background}
                            strokeOpacity={0.9}
                            strokeWidth={3}
                        />
                    </Svg>
                ) : null}

                {shown ? <TourBubble key={shown.key} reduced={reduced} stage={shown} /> : null}
            </Animated.View>
        </Modal>
    );
}

interface TourBubbleProps {
    reduced: boolean;
    stage: TourStage;
}

// Keyed per step: a fresh view always fires onLayout, and the old one fades out while the new one lands.
function TourBubble({ reduced, stage }: TourBubbleProps) {
    const { complete, next, skip } = useTour();
    const { height, width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const t = useTranslation();
    const [size, setSize] = useState<{ height: number; width: number } | null>(null);
    const layout = size
        ? calloutLayout({ bubble: size, insets, radius: stage.radius, target: stage.rect, window: { height, width } })
        : null;

    const timers = useTimers();
    const [live, setLive] = useState(false);
    const delay = stage.index > 0 && !reduced ? GLIDE.duration : BUBBLE_DELAY_MS;
    const entered = useSharedValue(0);
    useWhen(layout !== null, () => {
        entered.set(withDelay(delay, withTiming(1, BUBBLE_IN)));
        timers.after(delay, () => setLive(true));
    });
    // Drifts toward its target while it lands.
    const drift = layout?.above ? -BUBBLE_DRIFT : BUBBLE_DRIFT;
    const enterStyle = useAnimatedStyle(() => {
        const progress = entered.get();
        if (reduced) {
            return { opacity: progress };
        }
        return {
            opacity: progress,
            transform: [
                { translateY: (1 - progress) * drift },
                { scale: BUBBLE_START_SCALE + (1 - BUBBLE_START_SCALE) * progress },
            ],
        };
    });

    const steps = stepsFor(stage.tour);
    const isLog = stage.tour === "log";
    const last = stage.index + 1 >= steps.length;
    let primaryLabel = t("tour.gotIt");
    if (isLog) {
        primaryLabel = last ? t("tour.done") : t("tour.next");
    }
    const primaryPress = isLog && !last ? next : complete;

    const measure = (event: LayoutChangeEvent) => {
        const { height: bubbleHeight, width: bubbleWidth } = event.nativeEvent.layout;
        setSize((current) =>
            current?.height === bubbleHeight && current.width === bubbleWidth
                ? current
                : { height: bubbleHeight, width: bubbleWidth }
        );
    };

    return (
        <Animated.View
            exiting={reduced ? undefined : FadeOut.duration(BUBBLE_EXIT_MS)}
            pointerEvents="box-none"
            style={StyleSheet.absoluteFill}
        >
            {/* Hidden until it starts to show, so a quick second tap can't press a button nobody has seen. */}
            <Animated.View
                accessibilityElementsHidden={!live}
                accessibilityViewIsModal
                importantForAccessibility={live ? "auto" : "no-hide-descendants"}
                onLayout={measure}
                pointerEvents={live ? "auto" : "none"}
                style={[
                    styles.bubble,
                    {
                        backgroundColor: colors.card,
                        left: layout?.bubble.x ?? SCREEN_MARGIN,
                        maxHeight: height - insets.top - insets.bottom,
                        maxWidth: width - SCREEN_MARGIN * 2,
                        top: layout?.bubble.y ?? insets.top,
                    },
                    enterStyle,
                ]}
            >
                <ScrollView bounces={false} style={{ flexShrink: 1 }}>
                    <Text className="font-sans-semibold text-foreground text-[16px]">{t(stage.step.copy)}</Text>
                </ScrollView>
                <View
                    className={
                        isLog ? "flex-row items-center justify-between pt-3" : "flex-row items-center justify-end pt-3"
                    }
                >
                    {isLog ? (
                        <MonoLabel>{t("tour.step", { current: stage.index + 1, total: steps.length })}</MonoLabel>
                    ) : null}
                    <View className="flex-row items-center gap-4">
                        {isLog && !last ? (
                            <Pressable accessibilityRole="button" hitSlop={10} onPress={skip}>
                                <Text className="text-muted text-[15px]">{t("tour.skip")}</Text>
                            </Pressable>
                        ) : null}
                        <Pressable accessibilityRole="button" hitSlop={10} onPress={primaryPress}>
                            <Text className="text-tint font-sans-semibold text-[15px]">{primaryLabel}</Text>
                        </Pressable>
                    </View>
                </View>

                {layout ? (
                    <Svg
                        height={POINTER_HEIGHT}
                        style={[
                            { left: layout.pointerX - POINTER_WIDTH / 2, position: "absolute" },
                            layout.above ? { bottom: -POINTER_HEIGHT } : { top: -POINTER_HEIGHT },
                        ]}
                        width={POINTER_WIDTH}
                    >
                        <Path d={layout.above ? POINTER_DOWN : POINTER_UP} fill={colors.card} />
                    </Svg>
                ) : null}
            </Animated.View>
        </Animated.View>
    );
}

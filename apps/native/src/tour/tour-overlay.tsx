import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Path, Rect } from "react-native-svg";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";
import { useIsDark } from "@/theme/use-is-dark";

import { calloutLayout, holeRect, POINTER_HEIGHT, POINTER_WIDTH, SCREEN_MARGIN } from "./callout-layout";
import { stepsFor } from "./steps";
import { useTour } from "./tour-context";

interface BubbleMeasurement {
    height: number;
    key: string;
    width: number;
}

const MASK_ID = "tour-hole";
// A dark screen under a light-mode dim barely changes, so dark mode dims harder.
const SCRIM_OPACITY = { dark: 0.6, light: 0.35 } as const;
const POINTER_DOWN = `M0 0 L${POINTER_WIDTH} 0 L${POINTER_WIDTH / 2} ${POINTER_HEIGHT} Z`;
const POINTER_UP = `M0 ${POINTER_HEIGHT} L${POINTER_WIDTH} ${POINTER_HEIGHT} L${POINTER_WIDTH / 2} 0 Z`;

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
    const { complete, next, skip, stage } = useTour();
    const { height, width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const isDark = useIsDark();
    const t = useTranslation();
    const [measured, setMeasured] = useState<BubbleMeasurement | null>(null);

    const stageKey = stage ? `${stage.tour}:${stage.index}` : "";
    const bubble = measured?.key === stageKey ? measured : null;
    const layout =
        stage && bubble
            ? calloutLayout({ bubble, insets, radius: stage.radius, target: stage.rect, window: { height, width } })
            : null;
    const hole = stage ? holeRect(stage.rect, stage.radius) : null;

    const steps = stage ? stepsFor(stage.tour) : [];
    const isLog = stage?.tour === "log";
    const last = stage !== null && stage.index + 1 >= steps.length;
    let primaryLabel = t("tour.gotIt");
    if (isLog) {
        primaryLabel = last ? t("tour.done") : t("tour.next");
    }
    const primaryPress = isLog && !last ? next : complete;

    const measureBubble = (event: LayoutChangeEvent) => {
        const { height: bubbleHeight, width: bubbleWidth } = event.nativeEvent.layout;
        setMeasured((current) =>
            current?.key === stageKey && current.height === bubbleHeight && current.width === bubbleWidth
                ? current
                : { height: bubbleHeight, key: stageKey, width: bubbleWidth }
        );
    };

    return (
        <Modal
            // A fading Modal keeps taking taps until it finishes, so a quick tap after Done or Next was lost.
            animationType="none"
            navigationBarTranslucent
            onRequestClose={isLog ? skip : complete}
            statusBarTranslucent
            transparent
            visible={stage !== null}
        >
            <View style={{ flex: 1 }}>
                {stage && hole ? (
                    <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
                        <Defs>
                            <Mask height={height} id={MASK_ID} maskUnits="userSpaceOnUse" width={width} x={0} y={0}>
                                <Rect fill="#ffffff" height={height} width={width} x={0} y={0} />
                                <Rect
                                    fill="#000000"
                                    height={hole.height}
                                    rx={hole.radius}
                                    width={hole.width}
                                    x={hole.x}
                                    y={hole.y}
                                />
                            </Mask>
                        </Defs>
                        <Rect
                            fill="#000000"
                            fillOpacity={isDark ? SCRIM_OPACITY.dark : SCRIM_OPACITY.light}
                            height={height}
                            mask={`url(#${MASK_ID})`}
                            width={width}
                            x={0}
                            y={0}
                        />
                        <Rect
                            fill="none"
                            height={hole.height}
                            rx={hole.radius}
                            stroke={isDark ? colors.foreground : colors.background}
                            strokeOpacity={0.9}
                            strokeWidth={3}
                            width={hole.width}
                            x={hole.x}
                            y={hole.y}
                        />
                    </Svg>
                ) : null}

                {stage ? (
                    // Hidden until placed: a tap or screen reader on the unplaced bubble lands on the scrim.
                    <View
                        accessibilityElementsHidden={!layout}
                        accessibilityViewIsModal
                        importantForAccessibility={layout ? "auto" : "no-hide-descendants"}
                        onLayout={measureBubble}
                        pointerEvents={layout ? "auto" : "none"}
                        style={[
                            styles.bubble,
                            {
                                backgroundColor: colors.card,
                                left: layout?.bubble.x ?? SCREEN_MARGIN,
                                maxHeight: height - insets.top - insets.bottom,
                                maxWidth: width - SCREEN_MARGIN * 2,
                                opacity: layout ? 1 : 0,
                                top: layout?.bubble.y ?? insets.top,
                            },
                        ]}
                    >
                        <ScrollView bounces={false} style={{ flexShrink: 1 }}>
                            <Text className="font-sans-semibold text-foreground text-[16px]">{t(stage.step.copy)}</Text>
                        </ScrollView>
                        <View
                            className={
                                isLog
                                    ? "flex-row items-center justify-between pt-3"
                                    : "flex-row items-center justify-end pt-3"
                            }
                        >
                            {isLog ? (
                                <MonoLabel>
                                    {t("tour.step", { current: stage.index + 1, total: steps.length })}
                                </MonoLabel>
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
                    </View>
                ) : null}
            </View>
        </Modal>
    );
}

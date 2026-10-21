import { Canvas, Circle as SkCircle, Group as SkGroup, Path as SkPath } from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { Text as RNText, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useSettingBool } from "@/contexts/display-settings-context";
import { bucketDateLabel } from "@/data/insights";
import type { InsightsBucket, InsightsPeriod } from "@/data/insights";
import { formatAmount } from "@/domain/money";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useChartDraw, useChartPath } from "@/hooks/use-chart-draw";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hatchPathD } from "@/lib/chart-paths";
import { CHART_SCRUB } from "@/theme/chart";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { useChartInk } from "./chart-ink";
import { useScrubGesture } from "./use-scrub-gesture";
import { showXLabel } from "./x-label";

const HEIGHT = 150;
const LABEL_H = 18;
const LABEL_W = 32;
const PAD = { bottom: 12, top: 12 } as const;
const HEADROOM = 0.1;

interface InsightsNetChartProps {
    buckets: InsightsBucket[];
    code: string;
    nowMs: number;
    onCommit: (index: number | null) => void;
    onScrub: (index: number | null) => void;
    period: InsightsPeriod;
    selectedIndex: number | null;
    /** Running balance (see `runningTotals`). */
    totals: number[];
}

export function InsightsNetChart({
    buckets,
    totals,
    period,
    code,
    selectedIndex,
    onScrub,
    onCommit,
    nowMs,
}: InsightsNetChartProps) {
    const colors = useColors();
    const ink = useChartInk();
    const t = useTranslation();
    const { language } = useLanguage();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;

    const [width, setWidth] = useState(0);
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);

    const draw = useChartDraw(animated);
    const reported = useSharedValue(-1);

    const liveCount = useMemo(() => {
        let count = buckets.length;
        while (count > 1 && buckets[count - 1].start.getTime() > nowMs) {
            count -= 1;
        }
        return count;
    }, [buckets, nowMs]);

    const live = totals.slice(0, liveCount);

    const plot = useMemo(() => {
        const rawTop = Math.max(0, ...live);
        const rawBottom = Math.min(0, ...live);
        const pad = Math.max(1, rawTop - rawBottom) * HEADROOM;
        const top = rawTop + pad;
        const bottom = rawBottom - pad;
        const span = Math.max(1, top - bottom);
        const plotHeight = HEIGHT - PAD.top - PAD.bottom;
        const y = (value: number) => PAD.top + ((top - value) / span) * plotHeight;
        // Scaled to the whole window so the line meets the x-axis labels.
        const step = buckets.length > 1 ? width / (buckets.length - 1) : 0;
        return { step, x: (index: number) => index * step, y, zeroY: y(0) };
    }, [live, width, buckets.length]);

    const geometry = useMemo(() => {
        if (width <= 0 || live.length < 2) {
            return null;
        }
        const line = live
            .map((value, index) => {
                const command = index === 0 ? "M" : "L";
                return `${command} ${plot.x(index)} ${plot.y(value)}`;
            })
            .join(" ");

        const lastX = plot.x(live.length - 1);
        const area = `${line} L ${lastX} ${plot.zeroY} L 0 ${plot.zeroY} Z`;

        return {
            axis: `M 0 ${plot.zeroY} L ${width} ${plot.zeroY}`,
            hatch: hatchPathD(width, HEIGHT),
            line,
            surplus: area,
        };
    }, [live, plot, width]);

    const surplus = useChartPath(geometry?.surplus ?? "", animated, liveCount);
    const line = useChartPath(geometry?.line ?? "", animated, liveCount);
    const axis = useChartPath(geometry?.axis ?? "", animated, liveCount);
    const zeroY = useChartDraw(animated, plot.zeroY, plot.zeroY, liveCount);
    const aboveZero = useDerivedValue(() => ({ height: zeroY.get(), width, x: 0, y: 0 }));
    const belowZero = useDerivedValue(() => ({
        height: Math.max(0, HEIGHT - zeroY.get()),
        width,
        x: 0,
        y: zeroY.get(),
    }));

    const marker = scrubIndex ?? selectedIndex;
    const markerRule = useMemo(() => {
        if (marker == null || width <= 0 || marker >= live.length) {
            return null;
        }
        const x = plot.x(marker);
        const over = CHART_SCRUB.ruleOvershoot;
        return `M ${x} ${PAD.top - over} L ${x} ${HEIGHT - PAD.bottom + over}`;
    }, [marker, plot, width, live.length]);

    const count = live.length;
    const { step } = plot;
    const commit = (index: number) => {
        onCommit(selectedIndex === index ? null : index);
    };

    const report = (x: number) => {
        "worklet";
        if (step <= 0) {
            return;
        }
        const index = Math.min(count - 1, Math.max(0, Math.round(x / step)));
        if (index !== reported.get()) {
            reported.set(index);
            scheduleOnRN(setScrubIndex, index);
            scheduleOnRN(onScrub, index);
        }
    };

    const pan = useScrubGesture({ commit, onScrub, report, reported, setScrubIndex });

    const onLayout = (event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
    };

    const markerValue = marker == null ? undefined : live[marker];

    return (
        <View>
            <GestureDetector gesture={pan}>
                <View collapsable={false} onLayout={onLayout} style={{ height: HEIGHT }}>
                    {/* Skia's canvas swallows touches the wrapper's pan needs. */}
                    <Canvas pointerEvents="none" style={{ height: HEIGHT, width }}>
                        {geometry?.surplus ? (
                            <SkPath color={withAlpha(ink, 0.07)} opacity={draw} path={surplus} />
                        ) : null}

                        {geometry?.surplus && geometry.hatch ? (
                            <SkGroup clip={belowZero} opacity={draw}>
                                <SkGroup clip={surplus}>
                                    <SkPath
                                        color={withAlpha(colors.overBudget, 0.55)}
                                        path={geometry.hatch}
                                        strokeWidth={1.6}
                                        style="stroke"
                                    />
                                </SkGroup>
                            </SkGroup>
                        ) : null}

                        {/* One path drawn twice, clipped either side of the rule. */}
                        {geometry?.line ? (
                            <>
                                <SkGroup clip={aboveZero}>
                                    <SkPath
                                        color={colors.income}
                                        end={draw}
                                        path={line}
                                        strokeWidth={2.2}
                                        style="stroke"
                                    />
                                </SkGroup>
                                <SkGroup clip={belowZero}>
                                    <SkPath
                                        color={colors.overBudget}
                                        end={draw}
                                        path={line}
                                        strokeWidth={2.2}
                                        style="stroke"
                                    />
                                </SkGroup>
                            </>
                        ) : null}

                        {geometry?.axis ? (
                            <SkPath color={colors.foreground} path={axis} strokeWidth={1.6} style="stroke" />
                        ) : null}

                        {markerRule && marker != null && markerValue != null ? (
                            <SkGroup opacity={draw}>
                                <SkPath
                                    color={scrubIndex == null ? withAlpha(colors.foreground, 0.55) : colors.foreground}
                                    path={markerRule}
                                    strokeWidth={CHART_SCRUB.ruleWidth}
                                    style="stroke"
                                />
                                <SkCircle
                                    color={markerValue < 0 ? colors.overBudget : ink}
                                    cx={plot.x(marker)}
                                    cy={plot.y(markerValue)}
                                    r={scrubIndex == null ? CHART_SCRUB.dotRadius : CHART_SCRUB.activeDotRadius}
                                />
                            </SkGroup>
                        ) : null}
                    </Canvas>

                    {/* Invisible siblings give VoiceOver the per-slot readout the Skia path cannot. */}
                    <View pointerEvents="none" style={{ ...StyleSheetAbsoluteFill, flexDirection: "row" }}>
                        {live.map((value, index) => (
                            <View
                                accessibilityLabel={t(
                                    value < 0 ? "insights.net.slotBehind" : "insights.net.slotAhead",
                                    {
                                        amount: formatAmount(Math.abs(value), code, false, language),
                                        date: bucketDateLabel(period, buckets[index].start),
                                    }
                                )}
                                accessibilityRole="button"
                                accessibilityState={{ selected: selectedIndex === index }}
                                accessible
                                key={buckets[index].start.getTime()}
                                onAccessibilityTap={() => onCommit(selectedIndex === index ? null : index)}
                                style={{ width: plot.step }}
                            />
                        ))}
                    </View>
                </View>
            </GestureDetector>

            <View style={{ flexDirection: "row", height: LABEL_H, marginTop: 4 }}>
                {buckets.map((bucket, index) => (
                    <View key={bucket.start.getTime()} style={{ flex: 1 }}>
                        {showXLabel(period, index, bucket.label) ? (
                            <View
                                style={{
                                    alignItems: "center",
                                    left: "50%",
                                    marginLeft: -LABEL_W / 2,
                                    position: "absolute",
                                    width: LABEL_W,
                                }}
                            >
                                <RNText
                                    className="text-micro font-mono"
                                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                                    numberOfLines={1}
                                    style={{ color: colors.muted }}
                                >
                                    {bucket.label}
                                </RNText>
                            </View>
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

const StyleSheetAbsoluteFill = {
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0,
};

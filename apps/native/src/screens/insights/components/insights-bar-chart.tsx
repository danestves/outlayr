import { useMemo, useState } from "react";
import { Text as RNText, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useSettingBool } from "@/contexts/display-settings-context";
import { bucketDateLabel } from "@/data/insights";
import type { InsightsBucket, InsightsMeasure, InsightsPeriod } from "@/data/insights";
import { amountParts, formatAmount, withCurrencySymbol } from "@/domain/money";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useChartDraw } from "@/hooks/use-chart-draw";
import { useLanguage } from "@/i18n/context";
import { CHART_BAR, CHART_DASH, CHART_SCRUB, compactMagnitude, dashArray } from "@/theme/chart";
import { useColors } from "@/theme/use-colors";

import { useChartInk } from "./chart-ink";
import { useScrubGesture } from "./use-scrub-gesture";
import { showXLabel } from "./x-label";

const BAR_AREA = 150;
const LABEL_H = 18;
const LABEL_W = 32;
const HEADROOM = 0.1;

interface InsightsBarChartProps {
    average: number;
    buckets: InsightsBucket[];
    code: string;
    measure: Exclude<InsightsMeasure, "net">;
    nowMs: number;
    /** Fires on lift; null clears (a release on the locked bucket). */
    onCommit: (index: number | null) => void;
    onScrub: (index: number | null) => void;
    period: InsightsPeriod;
    selectedIndex: number | null;
}

interface Plot {
    /** Money units, not points. */
    span: number;
    top: number;
}

function makePlot(values: number[]): Plot {
    const rawTop = Math.max(0, ...values);
    const top = rawTop > 0 ? rawTop * (1 + HEADROOM) : 0;
    return { span: Math.max(1, top), top };
}

function gapFor(period: InsightsPeriod): number {
    if (period === "week") {
        return 6;
    }
    if (period === "year") {
        return 4;
    }
    return 2;
}

function barOpacity(future: boolean, dimmed: boolean): number {
    if (future) {
        return 0.3;
    }
    return dimmed ? 0.4 : 1;
}

/** `minDistance(0)` claims the touch on the way in: a competing tap gesture would be unresolvable. */
export function InsightsBarChart({
    buckets,
    period,
    measure,
    code,
    average,
    selectedIndex,
    onScrub,
    onCommit,
    nowMs,
}: InsightsBarChartProps) {
    const colors = useColors();
    const ink = useChartInk();
    const { language } = useLanguage();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;

    const [width, setWidth] = useState(0);
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);

    const reported = useSharedValue(-1);

    const gap = gapFor(period);
    const values = buckets.map((bucket) => Math.abs(bucket.value));
    const plot = useMemo(() => makePlot(values), [values]);

    const lastLive = useMemo(() => {
        let index = buckets.length - 1;
        while (index > 0 && buckets[index].start.getTime() > nowMs) {
            index -= 1;
        }
        return index;
    }, [buckets, nowMs]);

    const count = buckets.length;
    // Columns are `flex: 1` in a gapped row: `width / count` drifts a whole bar by day 31.
    const barWidth = count > 0 ? Math.max(0, (width - gap * (count - 1)) / count) : 0;
    const pitch = barWidth + gap;

    const commit = (index: number) => {
        onCommit(selectedIndex === index ? null : index);
    };

    const report = (x: number) => {
        "worklet";
        if (pitch <= 0) {
            return;
        }
        const raw = Math.min(count - 1, Math.floor(x / pitch));
        const index = Math.min(lastLive, Math.max(0, raw));
        if (index !== reported.get()) {
            reported.set(index);
            scheduleOnRN(setScrubIndex, index);
            scheduleOnRN(onScrub, index);
        }
    };

    const pan = useScrubGesture({ commit, onScrub, report, reported, setScrubIndex });

    const active = scrubIndex ?? selectedIndex;
    // Not concatenated: a Spanish device may write 1,2k.
    const averageParts = amountParts(Math.abs(average), code, false, language);
    const averageLabel = withCurrencySymbol(averageParts, compactMagnitude(average, averageParts.locale.decimal));

    const activeCount = values.filter((value) => value !== 0).length;
    const avgY = ((plot.top - average) / plot.span) * BAR_AREA;
    const showAverage = activeCount > 1 && avgY > BAR_AREA * 0.1 && avgY < BAR_AREA * 0.9;
    const averageTop = useChartDraw(animated, avgY - 7, avgY - 7);
    const averageStyle = useAnimatedStyle(() => ({ top: averageTop.get() }));

    const onLayout = (event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
    };

    return (
        <View>
            <GestureDetector gesture={pan}>
                <View onLayout={onLayout}>
                    <View style={{ flexDirection: "row", gap, height: BAR_AREA }}>
                        {buckets.map((bucket, index) => (
                            <Bar
                                animated={animated}
                                color={measure === "income" ? colors.income : ink}
                                dimmed={active != null && active !== index}
                                future={bucket.start.getTime() > nowMs}
                                key={index}
                                // The pan is invisible to VoiceOver, so each bar carries its own label and activation.
                                label={`${bucketDateLabel(period, bucket.start)}, ${formatAmount(Math.abs(bucket.value), code, false, language)}`}
                                onActivate={() => onCommit(selectedIndex === index ? null : index)}
                                plot={plot}
                                selected={selectedIndex === index}
                                trackColor={colors.railTrack}
                                value={values[index]}
                            />
                        ))}
                    </View>

                    {scrubIndex != null && width > 0 ? (
                        <View
                            pointerEvents="none"
                            style={{
                                backgroundColor: colors.foreground,
                                height: BAR_AREA + CHART_SCRUB.ruleOvershoot * 2,
                                left: pitch * scrubIndex + barWidth / 2,
                                position: "absolute",
                                top: -CHART_SCRUB.ruleOvershoot,
                                width: CHART_SCRUB.ruleWidth,
                            }}
                        />
                    ) : null}

                    {showAverage ? (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    alignItems: "center",
                                    flexDirection: "row",
                                    gap: 3,
                                    left: 0,
                                    position: "absolute",
                                    right: 0,
                                },
                                averageStyle,
                            ]}
                        >
                            <View
                                style={{
                                    backgroundColor: colors.background,
                                    borderRadius: 5,
                                    paddingHorizontal: 4,
                                    paddingVertical: 1,
                                }}
                            >
                                <AxisLabel color={colors.muted}>{averageLabel}</AxisLabel>
                            </View>
                            <DashedRule color={colors.muted} />
                        </Animated.View>
                    ) : null}
                </View>
            </GestureDetector>

            <View style={{ flexDirection: "row", gap, height: LABEL_H, marginTop: 4 }}>
                {buckets.map((bucket, index) => (
                    <View key={bucket.start.getTime()} style={{ flex: 1 }}>
                        {/* Overflows the narrow month column rather than truncating. */}
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
                                <AxisLabel color={colors.muted}>{bucket.label}</AxisLabel>
                            </View>
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

function DashedRule({ color }: { color: string }) {
    const [width, setWidth] = useState(0);
    return (
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flex: 1, height: 2 }}>
            {width > 0 ? (
                <Svg height={2} width={width}>
                    <Line
                        stroke={color}
                        strokeDasharray={dashArray(CHART_DASH.reference)}
                        strokeLinecap="round"
                        strokeWidth={2}
                        x1={0}
                        x2={width}
                        y1={1}
                        y2={1}
                    />
                </Svg>
            ) : null}
        </View>
    );
}

interface BarProps {
    animated: boolean;
    color: string;
    dimmed: boolean;
    future: boolean;
    label: string;
    onActivate: () => void;
    plot: Plot;
    selected: boolean;
    trackColor: string;
    value: number;
}

function Bar({ value, plot, color, trackColor, animated, dimmed, future, label, selected, onActivate }: BarProps) {
    const target = value > 0 ? Math.max(CHART_BAR.minHeight, (value / plot.span) * BAR_AREA) : 0;
    const height = useChartDraw(animated, target);

    const fillStyle = useAnimatedStyle(() => ({
        height: height.get(),
    }));

    return (
        <View
            accessibilityLabel={label}
            accessibilityRole={future ? "image" : "button"}
            accessibilityState={{ selected }}
            accessible
            onAccessibilityTap={future ? undefined : onActivate}
            style={{
                backgroundColor: trackColor,
                borderRadius: CHART_BAR.radius,
                flex: 1,
                height: BAR_AREA,
                opacity: barOpacity(future, dimmed),
            }}
        >
            <Animated.View
                style={[
                    {
                        backgroundColor: color,
                        borderRadius: CHART_BAR.radius,
                        bottom: 0,
                        left: 0,
                        position: "absolute",
                        right: 0,
                    },
                    fillStyle,
                ]}
            />
        </View>
    );
}

function AxisLabel({ children, color }: { children: string; color: string }) {
    return (
        <RNText
            className="text-micro font-mono"
            maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
            numberOfLines={1}
            style={{ color }}
        >
            {children}
        </RNText>
    );
}

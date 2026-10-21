import { use, useMemo, useState } from "react";
import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { createAnimatedComponent, useAnimatedProps, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { AmountsHiddenContext } from "@/components/amount-text";
import { Text } from "@/components/text";
import { useSettingBool } from "@/contexts/display-settings-context";
import { monthAbbrevTitle } from "@/domain/dates";
import type { LogMeasure } from "@/domain/log-measure";
import type { SparklinePoint } from "@/domain/log-sparkline";
import { formatAmount, maskedAmount } from "@/domain/money";
import { sparklineLabelKey } from "@/domain/sparkline-trend";
import { useChartDraw } from "@/hooks/use-chart-draw";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { CHART_SCRUB } from "@/theme/chart";
import { useColors } from "@/theme/use-colors";

const HEIGHT = 34;
const INSET = 10;
const DASH_SLACK = 1;

const AnimatedPath = createAnimatedComponent(Path);
const AnimatedCircle = createAnimatedComponent(Circle);

interface LogSparklineProps {
    byMonth: boolean;
    /** The currency the points are already valued in. */
    code: string;
    measure: LogMeasure;
    points: SparklinePoint[];
    positive: boolean;
    /** How many trailing points belong to the period being reported. */
    range: number;
}

export function LogSparkline({ points, positive, range, byMonth, code, measure }: LogSparklineProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const reduceMotion = useReducedMotion();
    const animatedCharts = useSettingBool("animatedCharts") && !reduceMotion;
    const [width, setWidth] = useState(0);
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);
    const draw = useChartDraw(animatedCharts);

    const color = positive ? colors.income : colors.danger;

    const geometry = useMemo(() => {
        if (points.length < 2 || width <= 0) {
            return null;
        }
        const amounts = points.map((point) => point.amount);
        const max = Math.max(...amounts);
        const min = Math.min(...amounts);
        const span = max - min || 1;
        const step = width / (points.length - 1);
        const coords = points.map((point, index) => ({
            x: step * index,
            y: HEIGHT - ((point.amount - min) / span) * HEIGHT,
        }));
        let dash = DASH_SLACK;
        for (const [i, c] of coords.slice(1).entries()) {
            dash += Math.hypot(c.x - coords[i].x, c.y - coords[i].y);
        }
        return {
            coords,
            d: coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" "),
            dash,
        };
    }, [points, width]);

    const dash = geometry?.dash ?? 0;
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: dash * (1 - draw.get()) }));
    const dotProps = useAnimatedProps(() => ({ opacity: draw.get() }));

    const labelKey = useMemo(
        () =>
            sparklineLabelKey(
                measure,
                points.map((point) => point.amount),
                byMonth
            ),
        [measure, points, byMonth]
    );

    const boundary = useMemo(() => {
        if (points.length < 2) {
            return 1;
        }
        return Math.min(1, Math.max(0, 1 - (range - 1) / (points.length - 1)));
    }, [points.length, range]);

    // Only numbers cross into the worklet: Reanimated cannot serialize `Date`s.
    const count = points.length;
    const pan = usePanGesture({
        onFinalize: () => {
            "worklet";
            scheduleOnRN(setScrubIndex, null);
        },
        onUpdate: (event) => {
            "worklet";
            if (width <= 0 || count < 2) {
                return;
            }
            const step = width / (count - 1);
            const index = Math.min(count - 1, Math.max(0, Math.round(event.x / step)));
            scheduleOnRN(setScrubIndex, index);
        },
    });

    if (points.length < 2) {
        return null;
    }

    const scrubbed = scrubIndex == null ? null : points[scrubIndex];
    const scrubCoord = scrubIndex == null ? null : (geometry?.coords[scrubIndex] ?? null);
    // Before the period starts, the scrubber marks history.
    const scrubColor = scrubIndex != null && points.length - range > scrubIndex ? colors.border : color;

    return (
        <View className="pt-4 pb-1" style={{ paddingHorizontal: INSET }}>
            {/* Nothing to commit, so one labelled node is the whole readout. */}
            <GestureDetector gesture={pan}>
                <View
                    accessibilityLabel={t(labelKey)}
                    accessibilityRole="image"
                    accessible
                    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
                    style={{ height: HEIGHT }}
                >
                    {geometry ? (
                        <Svg height={HEIGHT} width="100%">
                            <Defs>
                                <LinearGradient id="spark" x1="0" x2="1" y1="0" y2="0">
                                    <Stop offset={Math.max(0, boundary - 0.01)} stopColor={colors.border} />
                                    <Stop offset={boundary} stopColor={color} />
                                </LinearGradient>
                            </Defs>
                            <AnimatedPath
                                animatedProps={lineProps}
                                d={geometry.d}
                                fill="none"
                                stroke="url(#spark)"
                                strokeDasharray={[dash, dash]}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                            />
                            <AnimatedCircle
                                animatedProps={dotProps}
                                cx={geometry.coords.at(-1)?.x ?? 0}
                                cy={geometry.coords.at(-1)?.y ?? 0}
                                fill={color}
                                r={CHART_SCRUB.dotRadius}
                            />
                            {scrubCoord ? (
                                <>
                                    {/* Solid: dashed means a projection. */}
                                    <Path
                                        d={`M${scrubCoord.x} 0 L${scrubCoord.x} ${HEIGHT}`}
                                        stroke={scrubColor}
                                        strokeLinecap="round"
                                        strokeWidth={CHART_SCRUB.ruleWidth}
                                    />
                                    <Circle
                                        cx={scrubCoord.x}
                                        cy={scrubCoord.y}
                                        fill={scrubColor}
                                        r={CHART_SCRUB.activeDotRadius}
                                        stroke={colors.background}
                                        strokeWidth={2}
                                    />
                                </>
                            ) : null}
                        </Svg>
                    ) : null}
                </View>
            </GestureDetector>

            {scrubbed && scrubCoord ? (
                // Only up while a finger is down, so screen readers skip it.
                <View
                    accessibilityElementsHidden
                    className="bg-surface-secondary absolute items-center rounded-md px-1.75 py-1"
                    importantForAccessibility="no-hide-descendants"
                    pointerEvents="none"
                    style={{
                        bottom: HEIGHT + 8,
                        left: INSET + scrubCoord.x - 40,
                        width: 80,
                    }}
                >
                    <Text className="font-sans-medium text-micro text-muted">
                        {formatSample(scrubbed.date, byMonth, language)}
                    </Text>
                    <Text className="font-sans-semibold text-foreground text-label">
                        {hidden
                            ? maskedAmount(code)
                            : formatAmount(scrubbed.amount, code, Math.abs(scrubbed.amount) < 1000, language)}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

/** "24 Jul" by day, "Jul 26" by month. */
function formatSample(date: Date, byMonth: boolean, language: Language): string {
    const month = monthAbbrevTitle(date, language);
    return byMonth ? `${month} ${String(date.getFullYear()).slice(-2)}` : `${date.getDate()} ${month}`;
}

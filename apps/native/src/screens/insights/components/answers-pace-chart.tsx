import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { Text } from "@/components/text";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

const HEIGHT = 160;
const TOP = 18;
const AXIS_Y = 150;
const LABEL_W = 44;
const DASH = "4 4";

export interface PaceTick {
    day: number;
    label: string;
}

interface AnswersPaceChartProps {
    cumulative: readonly number[];
    days: number;
    forecast: number | null;
    forecastLabel: string | null;
    limit: number | null;
    limitLabel: string | null;
    ticks: readonly PaceTick[];
    todayLabel: string | null;
}

function tickAlign(left: number, width: number): "center" | "flex-end" | "flex-start" {
    if (left === 0) {
        return "flex-start";
    }
    return left === width - LABEL_W ? "flex-end" : "center";
}

function MonoText({ children, color }: { children: string; color: string }) {
    return (
        <Text
            className="text-micro font-mono"
            maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
            numberOfLines={1}
            style={{ color }}
        >
            {children}
        </Text>
    );
}

export function AnswersPaceChart({
    cumulative,
    days,
    forecast,
    forecastLabel,
    limit,
    limitLabel,
    ticks,
    todayLabel,
}: AnswersPaceChartProps) {
    const colors = useColors();
    const [width, setWidth] = useState(0);
    const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

    const spent = cumulative.at(-1) ?? 0;
    const top = Math.max(1, limit ?? 0, forecast ?? 0, spent);
    const x = (day: number) => (day / days) * width;
    const y = (value: number) => AXIS_Y - (value / top) * (AXIS_Y - TOP);
    const todayX = x(cumulative.length);
    const todayY = y(spent);
    const over = limit != null && forecast != null && forecast > limit;
    const projection = over ? colors.danger : colors.muted;

    const line = [`M 0 ${AXIS_Y}`, ...cumulative.map((value, index) => `L ${x(index + 1)} ${y(value)}`)].join(" ");

    return (
        <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={onLayout}
            pointerEvents="none"
        >
            <View style={{ height: HEIGHT }}>
                {width > 0 ? (
                    <Svg height={HEIGHT} width={width}>
                        {limit == null ? null : (
                            <Line
                                stroke={colors.muted}
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                x1={0}
                                x2={width}
                                y1={y(limit)}
                                y2={y(limit)}
                            />
                        )}
                        <Line stroke={colors.border} strokeWidth={1} x1={0} x2={width} y1={AXIS_Y} y2={AXIS_Y} />
                        {forecast == null ? null : (
                            <Path
                                d={`M ${todayX} ${todayY} L ${width} ${y(forecast)}`}
                                fill="none"
                                stroke={projection}
                                strokeDasharray={DASH}
                                strokeLinecap="round"
                                strokeWidth={2}
                            />
                        )}
                        <Path
                            d={line}
                            fill="none"
                            stroke={colors.foreground}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                        />
                        {forecast == null ? null : <Circle cx={todayX} cy={todayY} fill={colors.foreground} r={4} />}
                    </Svg>
                ) : null}
                {width > 0 && limit != null && limitLabel ? (
                    <View style={{ left: 0, position: "absolute", top: Math.max(0, y(limit) - 14) }}>
                        <MonoText color={colors.muted}>{limitLabel.toUpperCase()}</MonoText>
                    </View>
                ) : null}
                {width > 0 && forecast != null && forecastLabel ? (
                    <View style={{ position: "absolute", right: 0, top: Math.max(0, y(forecast) - 16) }}>
                        <MonoText color={projection}>{forecastLabel}</MonoText>
                    </View>
                ) : null}
                {width > 0 && forecast != null && todayLabel ? (
                    <View
                        style={{
                            position: "absolute",
                            top: todayY + 6,
                            ...(todayX > width * 0.8 ? { right: width - todayX + 8 } : { left: todayX + 8 }),
                        }}
                    >
                        <MonoText color={colors.muted}>{todayLabel.toUpperCase()}</MonoText>
                    </View>
                ) : null}
            </View>
            <View style={{ height: 14, marginTop: 8 }}>
                {width > 0
                    ? ticks.map((tick) => {
                          const left = Math.min(Math.max(0, x(tick.day + 0.5) - LABEL_W / 2), width - LABEL_W);
                          const align = tickAlign(left, width);
                          return (
                              <View
                                  key={tick.day}
                                  style={{ alignItems: align, left, position: "absolute", width: LABEL_W }}
                              >
                                  <MonoText color={colors.muted}>{tick.label}</MonoText>
                              </View>
                          );
                      })
                    : null}
            </View>
        </View>
    );
}

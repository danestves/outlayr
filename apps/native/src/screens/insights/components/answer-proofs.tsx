import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { Text } from "@/components/text";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const BARS_HEIGHT = 72;
const BAR_GAP = 8;
const BAR_RADIUS = 4;
const QUIET_BAR = 0.18;

interface LimitBarsProps {
    bars: readonly number[];
    labels: readonly string[];
    limit: number;
}

export function LimitBars({ bars, labels, limit }: LimitBarsProps) {
    const colors = useColors();
    const [width, setWidth] = useState(0);
    const top = Math.max(1, limit, ...bars);
    const barWidth = bars.length > 0 ? (width - BAR_GAP * (bars.length - 1)) / bars.length : 0;
    const limitY = BARS_HEIGHT - (limit / top) * BARS_HEIGHT;
    const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

    return (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={onLayout}>
            {width > 0 ? (
                <Svg height={BARS_HEIGHT} width={width}>
                    {bars.map((value, index) => {
                        const height = Math.max(1, (value / top) * BARS_HEIGHT);
                        return (
                            <Rect
                                fill={
                                    index === bars.length - 1 ? colors.danger : withAlpha(colors.foreground, QUIET_BAR)
                                }
                                height={height}
                                key={labels[index]}
                                rx={BAR_RADIUS}
                                width={barWidth}
                                x={index * (barWidth + BAR_GAP)}
                                y={BARS_HEIGHT - height}
                            />
                        );
                    })}
                    <Line
                        stroke={colors.muted}
                        strokeDasharray="3 3"
                        strokeWidth={1}
                        x1={0}
                        x2={width}
                        y1={limitY}
                        y2={limitY}
                    />
                </Svg>
            ) : (
                <View style={{ height: BARS_HEIGHT }} />
            )}
            <View className="flex-row pt-1" style={{ gap: BAR_GAP }}>
                {labels.map((label) => (
                    <View className="flex-1 items-center" key={label}>
                        <Text
                            className="text-micro text-muted font-mono"
                            maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

interface UsualBarsProps {
    amount: string;
    under: boolean;
    value: number;
    usual: number;
    usualAmount: string;
    usualLabel: string;
    valueLabel: string;
}

function BarRow({
    amount,
    color,
    fraction,
    label,
}: {
    amount: string;
    color: string;
    fraction: number;
    label: string;
}) {
    return (
        <View className="flex-row items-center gap-2 pt-2">
            <Text className="text-footnote text-muted w-24" numberOfLines={1}>
                {label}
            </Text>
            <View className="flex-1">
                <View
                    style={{ backgroundColor: color, borderRadius: BAR_RADIUS, height: 8, width: `${fraction * 100}%` }}
                />
            </View>
            <Text className="font-sans-semibold text-footnote text-foreground min-w-14 text-right tabular-nums">
                {amount}
            </Text>
        </View>
    );
}

export function UsualBars({ amount, under, usual, usualAmount, usualLabel, value, valueLabel }: UsualBarsProps) {
    const colors = useColors();
    const top = Math.max(1, value, usual);
    return (
        <View>
            <BarRow
                amount={amount}
                color={under ? colors.income : colors.danger}
                fraction={value / top}
                label={valueLabel}
            />
            <BarRow
                amount={usualAmount}
                color={withAlpha(colors.foreground, QUIET_BAR)}
                fraction={usual / top}
                label={usualLabel}
            />
        </View>
    );
}

export interface ProofRow {
    amount: string;
    id: string;
    name: string;
}

export function ProofRows({ rows }: { rows: readonly ProofRow[] }) {
    return (
        <View>
            {rows.map((row, index) => (
                <View
                    className={`border-border flex-row items-baseline justify-between gap-3 py-2 ${index === rows.length - 1 ? "" : "border-b"}`}
                    key={row.id}
                >
                    <Text className="text-subtitle text-foreground flex-1" numberOfLines={1}>
                        {row.name}
                    </Text>
                    <Text className="text-subtitle text-foreground tabular-nums">{row.amount}</Text>
                </View>
            ))}
        </View>
    );
}

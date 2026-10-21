import { Canvas, DashPathEffect, Circle as SkCircle, Path as SkPath } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { useSettingBool } from "@/contexts/display-settings-context";
import type { GoalLinePoint } from "@/domain/goal-pace-geometry";
import { makeGeometry } from "@/domain/goal-pace-geometry";
import { useChartDraw, useChartPath } from "@/hooks/use-chart-draw";
import { CHART_DASH } from "@/theme/chart";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

interface GoalPaceChartProps {
    actual: readonly GoalLinePoint[];
    label?: string;
    height?: number;
    nowMs: number;
    required: readonly GoalLinePoint[];
    startTime: number;
    target: number;
    targetTime: number;
    width: number;
}

export function GoalPaceChart({
    actual,
    height = 150,
    label,
    nowMs,
    required,
    startTime,
    target,
    targetTime,
    width,
}: GoalPaceChartProps) {
    const colors = useColors();
    const reduceMotion = useReducedMotion();
    const animatedCharts = useSettingBool("animatedCharts") && !reduceMotion;
    const draw = useChartDraw(animatedCharts);

    const geometry = useMemo(
        () => makeGeometry({ actual, height, nowMs, required, startTime, target, targetTime, width }),
        [actual, required, startTime, targetTime, target, nowMs, width, height]
    );
    const pointCount = actual.length;
    const requiredPath = useChartPath(geometry.required, animatedCharts, pointCount);
    const axis = useChartPath(geometry.axis, animatedCharts, pointCount);
    const actualPath = useChartPath(geometry.actual ?? "", animatedCharts, pointCount);
    const projection = useChartPath(geometry.projection ?? "", animatedCharts, pointCount);
    const goalX = useChartDraw(animatedCharts, geometry.goal.x, geometry.goal.x, pointCount);
    const goalY = useChartDraw(animatedCharts, geometry.goal.y, geometry.goal.y, pointCount);

    return (
        <View
            accessibilityLabel={label}
            accessibilityRole={label ? "image" : undefined}
            accessible={label != null}
            collapsable={false}
            style={{ height, width }}
        >
            <Canvas pointerEvents="none" style={{ height, width }}>
                {/* Drawn first so the balance line reads over it. */}
                <SkPath color={colors.muted} path={requiredPath} strokeWidth={1} style="stroke">
                    <DashPathEffect intervals={[...CHART_DASH.reference]} />
                </SkPath>

                <SkPath color={colors.border} path={axis} strokeWidth={1} style="stroke" />

                {geometry.actual ? (
                    <SkPath color={colors.foreground} end={draw} path={actualPath} strokeWidth={2.2} style="stroke" />
                ) : null}

                {geometry.projection ? (
                    <SkPath
                        color={withAlpha(colors.foreground, 0.4)}
                        opacity={draw}
                        path={projection}
                        strokeWidth={1.4}
                        style="stroke"
                    >
                        <DashPathEffect intervals={[...CHART_DASH.projection]} />
                    </SkPath>
                ) : null}

                {geometry.head ? (
                    <PaceHead
                        animated={animatedCharts}
                        color={colors.foreground}
                        draw={draw}
                        x={geometry.head.x}
                        y={geometry.head.y}
                        pointCount={pointCount}
                    />
                ) : null}

                {/* The target itself, hollow: a mark the line has not reached yet. */}
                <SkCircle
                    color={colors.foreground}
                    cx={goalX}
                    cy={goalY}
                    opacity={draw}
                    r={3.8}
                    strokeWidth={1.6}
                    style="stroke"
                />
            </Canvas>
        </View>
    );
}

interface PaceHeadProps {
    animated: boolean;
    color: string;
    draw: SharedValue<number>;
    pointCount: number;
    x: number;
    y: number;
}

function PaceHead({ animated, color, draw, pointCount, x, y }: PaceHeadProps) {
    const cx = useChartDraw(animated, x, x, pointCount);
    const cy = useChartDraw(animated, y, y, pointCount);
    return <SkCircle color={color} cx={cx} cy={cy} opacity={draw} r={3.8} />;
}

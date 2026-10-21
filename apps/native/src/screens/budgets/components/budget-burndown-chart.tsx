import {
    Canvas,
    DashPathEffect,
    Circle as SkCircle,
    Group as SkGroup,
    Path as SkPath,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useDerivedValue, useReducedMotion, useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useSettingBool } from "@/contexts/display-settings-context";
import type { Burndown } from "@/domain/budget-burndown";
import { useChartDraw, useChartPath } from "@/hooks/use-chart-draw";
import { useTranslation } from "@/i18n/context";
import { hatchPathD } from "@/lib/chart-paths";
import { CHART_DASH, CHART_SCRUB } from "@/theme/chart";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

interface BudgetBurndownChartProps {
    burndown: Burndown;
    height?: number;
    limit: number;
    /** The scrubbed day, 1-indexed, or null when the finger lifts. */
    onScrub?: (day: number | null) => void;
    /**
     * Pins the axis to ±limit so a column of rows shares one unit, and drops the pan, which claims the touch on
     * landing and would stop the row registering a tap.
     */
    thumbnail?: boolean;
    width: number;
}

const PAD = { bottom: 10, left: 4, right: 4, top: 10 } as const;

interface Plot {
    plotLeft: number;
    plotRight: number;
    span: number;
    x: (day: number) => number;
    y: (value: number) => number;
    zeroY: number;
}

function makePlot(burndown: Burndown, limit: number, width: number, height: number, domain: "auto" | "limit"): Plot {
    const plotLeft = PAD.left;
    const plotRight = width - PAD.right;
    const span = Math.max(1, burndown.totalDays - 1);

    let rawTop: number;
    let rawBottom: number;
    if (domain === "limit") {
        rawTop = Math.max(1, limit);
        rawBottom = -rawTop;
    } else {
        const balances = burndown.points.map((p) => p.balance);
        const candidates = [limit, 0, ...balances];
        if (burndown.projectedBalance != null) {
            candidates.push(burndown.projectedBalance);
        }
        rawTop = Math.max(...candidates);
        rawBottom = Math.min(...candidates);
    }
    const range = Math.max(1, rawTop - rawBottom);

    const plotTop = PAD.top;
    const plotHeight = height - PAD.top - PAD.bottom;

    const y = (value: number) => {
        const clamped = Math.min(rawTop, Math.max(rawBottom, value));
        return plotTop + ((rawTop - clamped) / range) * plotHeight;
    };

    return {
        plotLeft,
        plotRight,
        span,
        x: (day) => plotLeft + ((day - 1) / span) * (plotRight - plotLeft),
        y,
        zeroY: y(0),
    };
}

function actualPathD(burndown: Burndown, limit: number, plot: Plot): string {
    const parts = [`M ${plot.x(1)} ${plot.y(limit)}`];
    let previous = limit;
    for (const point of burndown.points) {
        parts.push(`L ${plot.x(point.day)} ${plot.y(previous)}`, `L ${plot.x(point.day)} ${plot.y(point.balance)}`);
        previous = point.balance;
    }
    return parts.join(" ");
}

function deficitPathD(burndown: Burndown, plot: Plot, last: Burndown["points"][number], crossX: number): string {
    const tail =
        burndown.projectedBalance == null
            ? `L ${plot.x(last.day)} ${plot.zeroY}`
            : `L ${plot.x(burndown.totalDays)} ${plot.y(burndown.projectedBalance)} L ${plot.x(burndown.totalDays)} ${plot.zeroY}`;
    return `M ${crossX} ${plot.zeroY} L ${crossX} ${plot.y(last.balance)} L ${plot.x(last.day)} ${plot.y(last.balance)} ${tail} Z`;
}

function makeGeometry(burndown: Burndown, limit: number, width: number, height: number, domain: "auto" | "limit") {
    const plot = makePlot(burndown, limit, width, height, domain);
    const last = burndown.points.at(-1);
    const actualD = actualPathD(burndown, limit, plot);

    const actual = actualD;
    const ideal = `M ${plot.x(1)} ${plot.y(limit)} L ${plot.x(burndown.totalDays)} ${plot.y(0)}`;

    const projection =
        last && burndown.projectedBalance != null
            ? `M ${plot.x(last.day)} ${plot.y(last.balance)} L ${plot.x(burndown.totalDays)} ${plot.y(burndown.projectedBalance)}`
            : null;

    const surplus = `${actualD} L ${plot.x(last?.day ?? 1)} ${plot.zeroY} L ${plot.x(1)} ${plot.zeroY} Z`;

    const deficit =
        burndown.runwayDay != null && last ? deficitPathD(burndown, plot, last, plot.x(burndown.runwayDay)) : null;

    const hatch = hatchPathD(width, height);

    const axis = `M ${plot.plotLeft} ${plot.zeroY} L ${plot.plotRight} ${plot.zeroY}`;

    return {
        actual,
        axis,
        deficit,
        hatch,
        ideal,
        last,
        plot,
        projection,
        surplus,
    };
}

interface BurndownMarkerProps {
    animated: boolean;
    colors: ReturnType<typeof useColors>;
    draw: SharedValue<number>;
    marker: Burndown["points"][number];
    markerRule: string | null;
    plot: Plot;
    pointCount: number;
    scrubbing: boolean;
}

function BurndownMarker({
    animated,
    colors,
    draw,
    marker,
    markerRule,
    plot,
    pointCount,
    scrubbing,
}: BurndownMarkerProps) {
    const settles = animated && !scrubbing;
    const rule = useChartPath(markerRule ?? "", settles, pointCount);
    const cx = useChartDraw(settles, plot.x(marker.day), plot.x(marker.day), pointCount);
    const cy = useChartDraw(settles, plot.y(marker.balance), plot.y(marker.balance), pointCount);
    return (
        <SkGroup opacity={draw}>
            {markerRule ? (
                <SkPath
                    color={scrubbing ? colors.foreground : withAlpha(colors.foreground, 0.55)}
                    path={rule}
                    strokeWidth={CHART_SCRUB.ruleWidth}
                    style="stroke"
                />
            ) : null}
            <SkCircle
                color={marker.balance < 0 ? colors.overBudget : colors.foreground}
                cx={cx}
                cy={cy}
                r={scrubbing ? CHART_SCRUB.activeDotRadius : CHART_SCRUB.dotRadius}
            />
        </SkGroup>
    );
}

interface RunwayMarkProps {
    animated: boolean;
    color: string;
    draw: SharedValue<number>;
    pointCount: number;
    x: number;
    y: SharedValue<number>;
}

function RunwayMark({ animated, color, draw, pointCount, x, y }: RunwayMarkProps) {
    const cx = useChartDraw(animated, x, x, pointCount);
    return <SkCircle color={color} cx={cx} cy={y} opacity={draw} r={3.4} strokeWidth={2} style="stroke" />;
}

interface PanGestureParams {
    activeDay: SharedValue<number>;
    interactive: boolean;
    lastDay: number;
    onScrub?: (day: number | null) => void;
    plot: Plot;
    scrubX: SharedValue<number>;
    setScrubDay: (day: number | null) => void;
}

function useScrubPan({ activeDay, interactive, lastDay, onScrub, plot, scrubX, setScrubDay }: PanGestureParams) {
    const { plotLeft, plotRight, span } = plot;

    const report = (x: number) => {
        "worklet";
        scrubX.set(x);
        const ratio = (x - plotLeft) / Math.max(1, plotRight - plotLeft);
        const day = Math.round(ratio * span) + 1;
        const clamped = Math.min(lastDay, Math.max(1, day));
        // Cross to JS only when the snapped day changes: one call per day rather than per frame.
        if (clamped !== activeDay.get()) {
            activeDay.set(clamped);
            scheduleOnRN(setScrubDay, clamped);
            if (onScrub) {
                scheduleOnRN(onScrub, clamped);
            }
        }
    };

    return usePanGesture({
        enabled: interactive,
        minDistance: 0,
        onBegin: (event) => {
            "worklet";
            report(event.x);
        },
        onFinalize: () => {
            "worklet";
            scrubX.set(-1);
            activeDay.set(-1);
            scheduleOnRN(setScrubDay, null);
            if (onScrub) {
                scheduleOnRN(onScrub, null);
            }
        },
        onUpdate: (event) => {
            "worklet";
            report(event.x);
        },
        shouldCancelWhenOutside: false,
    });
}

export function BudgetBurndownChart({
    burndown,
    limit,
    width,
    height = 150,
    onScrub,
    thumbnail = false,
}: BudgetBurndownChartProps) {
    const interactive = !thumbnail;
    const domain = thumbnail ? "limit" : "auto";
    const colors = useColors();
    const t = useTranslation();
    const reduceMotion = useReducedMotion();
    const animatedCharts = useSettingBool("animatedCharts") && !reduceMotion;
    const [scrubDay, setScrubDay] = useState<number | null>(null);

    const scrubX = useSharedValue(-1);
    const activeDay = useSharedValue(-1);
    const draw = useChartDraw(animatedCharts);

    const geometry = useMemo(
        () => makeGeometry(burndown, limit, width, height, domain),
        [burndown, limit, width, height, domain]
    );

    const { plot, last } = geometry;
    const pointCount = burndown.points.length;
    const surplus = useChartPath(geometry.surplus, animatedCharts, pointCount);
    const deficit = useChartPath(geometry.deficit ?? "", animatedCharts, pointCount);
    const ideal = useChartPath(geometry.ideal, animatedCharts, pointCount);
    const actual = useChartPath(geometry.actual, animatedCharts, pointCount);
    const projection = useChartPath(geometry.projection ?? "", animatedCharts, pointCount);
    const axis = useChartPath(geometry.axis, animatedCharts, pointCount);
    const zeroY = useChartDraw(animatedCharts, plot.zeroY, plot.zeroY, pointCount);
    const aboveZero = useDerivedValue(() => ({ height: zeroY.get(), width, x: 0, y: 0 }));
    const belowZero = useDerivedValue(() => ({ height: height - zeroY.get(), width, x: 0, y: zeroY.get() }));

    const scrubbed = scrubDay == null ? null : burndown.points[scrubDay - 1];
    const marker = scrubbed ?? last;

    const markerRule = useMemo(() => {
        if (!marker) {
            return null;
        }
        const x = plot.x(marker.day);
        const over = CHART_SCRUB.ruleOvershoot;
        return `M ${x} ${PAD.top - over} L ${x} ${height - PAD.bottom + over}`;
    }, [plot, marker, height]);

    const pan = useScrubPan({
        activeDay,
        interactive,
        lastDay: burndown.points.length,
        onScrub,
        plot,
        scrubX,
        setScrubDay,
    });

    /** A share of the limit: the chart is handed no currency code to qualify an amount. */
    const summary = useMemo(() => {
        const day = last?.day ?? 1;
        const balance = last?.balance ?? limit;
        const share = Math.round((Math.abs(balance) / Math.max(1, limit)) * 100);
        return t(balance < 0 ? "insights.burndown.over" : "insights.burndown.holding", {
            day,
            days: burndown.totalDays,
            percent: share,
        });
    }, [last, limit, burndown.totalDays, t]);

    const canvas = (
        <View
            accessibilityElementsHidden={!interactive}
            accessibilityLabel={interactive ? summary : undefined}
            accessibilityRole={interactive ? "image" : undefined}
            accessible={interactive}
            collapsable={false}
            importantForAccessibility={interactive ? undefined : "no-hide-descendants"}
            style={{ height, width }}
        >
            {/* Skia's canvas swallows touches, so the wrapper's pan detector needs it to opt out. */}
            <Canvas pointerEvents="none" style={{ height, width }}>
                {geometry.surplus ? (
                    <SkPath color={withAlpha(colors.foreground, 0.07)} opacity={draw} path={surplus} />
                ) : null}

                {geometry.deficit && geometry.hatch ? (
                    <SkGroup clip={deficit} opacity={draw}>
                        <SkPath
                            color={withAlpha(colors.overBudget, 0.55)}
                            path={geometry.hatch}
                            strokeWidth={1.6}
                            style="stroke"
                        />
                    </SkGroup>
                ) : null}

                {geometry.ideal ? (
                    <SkPath color={colors.muted} path={ideal} strokeWidth={1} style="stroke">
                        <DashPathEffect intervals={[...CHART_DASH.reference]} />
                    </SkPath>
                ) : null}

                {/* One path drawn twice, clipped either side of the zero rule. */}
                {geometry.actual ? (
                    <>
                        <SkGroup clip={aboveZero}>
                            <SkPath
                                color={colors.foreground}
                                end={draw}
                                path={actual}
                                strokeWidth={2.2}
                                style="stroke"
                            />
                        </SkGroup>
                        <SkGroup clip={belowZero}>
                            <SkPath
                                color={colors.overBudget}
                                end={draw}
                                path={actual}
                                strokeWidth={2.2}
                                style="stroke"
                            />
                        </SkGroup>
                    </>
                ) : null}

                {geometry.projection ? (
                    <SkPath
                        color={(burndown.projectedBalance ?? 0) < 0 ? colors.overBudget : colors.muted}
                        opacity={draw}
                        path={projection}
                        strokeWidth={1.6}
                        style="stroke"
                    >
                        <DashPathEffect intervals={[...CHART_DASH.projection]} />
                    </SkPath>
                ) : null}

                {geometry.axis ? (
                    <SkPath color={colors.foreground} path={axis} strokeWidth={1.6} style="stroke" />
                ) : null}

                {burndown.runwayDay == null ? null : (
                    <RunwayMark
                        animated={animatedCharts}
                        color={colors.overBudget}
                        draw={draw}
                        x={plot.x(burndown.runwayDay)}
                        y={zeroY}
                        pointCount={pointCount}
                    />
                )}

                {marker ? (
                    <BurndownMarker
                        animated={animatedCharts}
                        colors={colors}
                        draw={draw}
                        marker={marker}
                        markerRule={markerRule}
                        plot={plot}
                        scrubbing={scrubbed != null}
                        pointCount={pointCount}
                    />
                ) : null}
            </Canvas>
        </View>
    );

    // A disabled detector still claims the touch, leaving the thumbnail a dead zone for the row's swipe.
    return interactive ? <GestureDetector gesture={pan}>{canvas}</GestureDetector> : canvas;
}

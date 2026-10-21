import type { BudgetWindow } from "@outlayr/money/budget-window";
import {
    Canvas,
    DashPathEffect,
    Circle as SkCircle,
    Group as SkGroup,
    Line as SkLine,
    Path as SkPath,
    vec,
} from "@shopify/react-native-skia";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { MonoLabel } from "@/components/mono-label";
import { SheetDragRegion } from "@/components/sheet-drag-region";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Burndown, BurndownPoint } from "@/domain/budget-burndown";
import { crossingDay } from "@/domain/budget-limit-crossing";
import { LIMIT_STEP } from "@/domain/budget-limit-step";
import { daysLeftInWindow, leftPerDay } from "@/domain/budget-math";
import { windowsOver } from "@/domain/budget-typical";
import { monthAbbrevTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { hatchPathD, weekRulesD } from "@/lib/chart-paths";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

interface BudgetLimitPickerProps {
    /** Window-to-date burn-down built with `limit: 0`, so `points[].spent` is the curve. */
    burndown: Burndown;
    currency: string;
    history?: readonly number[];
    limit: number;
    nowMs: number;
    onLimit: (next: number) => void;
    periodPhrase: string;
    sampleSize: number;
    window: BudgetWindow;
    windowLabel: string;
}

/** Below this many expenses the crossing lands wherever the largest charge happened to. */
const SPARSE_HISTORY = 10;

/** The curve stops at today, so a whole-window verdict needs this much elapsed. Mirrors `PROJECTION_FLOOR`. */
const ELAPSED_FLOOR = 0.2;

const CHART_HEIGHT = 200;
const GUTTER = 20;
const PAD = { bottom: 18, left: 6, right: 6, top: 18 } as const;
const PLOT_TOP = PAD.top;
const PLOT_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;

function yForLimit(value: number, axisTop: number): number {
    return PLOT_TOP + (1 - value / axisTop) * PLOT_HEIGHT;
}

function curvePathD(
    points: readonly BurndownPoint[],
    x: (day: number) => number,
    y: (value: number) => number
): string {
    const parts = [`M ${x(1)} ${y(0)}`];
    let previous = 0;
    for (const point of points) {
        parts.push(`L ${x(point.day)} ${y(previous)}`, `L ${x(point.day)} ${y(point.spent)}`);
        previous = point.spent;
    }
    return parts.join(" ");
}

function formatDayMonth(date: Date, language: Language): string {
    return `${date.getDate()} ${monthAbbrevTitle(date, language)}`;
}

export function BudgetLimitPicker({
    burndown,
    sampleSize,
    currency,
    window: budgetWindow,
    windowLabel,
    periodPhrase,
    history,
    limit,
    nowMs,
    onLimit,
}: BudgetLimitPickerProps) {
    const windowStart = budgetWindow.start;
    const { showCents } = useDisplaySettings().state;
    const colors = useColors();
    const haptics = useHaptics();
    const t = useTranslation();
    const { language } = useLanguage();
    const { width: windowWidth } = useWindowDimensions();
    const [measured, setMeasured] = useState(0);
    const width = measured > 0 ? measured : windowWidth - GUTTER * 2;

    const cumulative = useMemo(() => burndown.points.map((point) => point.spent), [burndown]);
    const total = cumulative.at(-1) ?? 0;
    // Frozen at mount so the plot does not rescale under a dragging finger; the caller remounts it per period.
    const [axisTop] = useState(() => Math.max(LIMIT_STEP * 4, total * 1.35, limit * 1.2));
    const maxLimit = Math.floor(axisTop / LIMIT_STEP) * LIMIT_STEP;
    const elapsedFraction = burndown.points.length / burndown.totalDays;
    const sparse = sampleSize < SPARSE_HISTORY || elapsedFraction < ELAPSED_FLOOR;

    const limitY = useSharedValue(yForLimit(limit, axisTop));
    const snapped = useSharedValue(limit);
    const dragging = useSharedValue(false);
    // Shared, not a ref: a ref written from the gesture closure made the compiler bail on the whole component.
    const lastCrossing = useSharedValue<number | null>(null);

    useEffect(() => {
        lastCrossing.set(crossingDay(cumulative, limit));
        // Mid-drag the finger owns the line; writing back a trailing render would jolt it.
        if (dragging.get()) {
            return;
        }
        limitY.set(yForLimit(Math.min(limit, maxLimit), axisTop));
        snapped.set(limit);
    }, [limit, axisTop, maxLimit, cumulative, limitY, snapped, dragging, lastCrossing]);

    const applyLimit = useCallback(
        (next: number) => {
            if (sparse) {
                haptics("selection");
            } else {
                const crossing = crossingDay(cumulative, next);
                if (crossing !== lastCrossing.get()) {
                    const turned = lastCrossing.get() === null && crossing !== null;
                    haptics(turned ? "medium" : "light");
                    lastCrossing.set(crossing);
                }
            }
            onLimit(next);
        },
        [cumulative, sparse, haptics, lastCrossing, onLimit]
    );

    const report = (y: number) => {
        "worklet";
        const raw = ((PLOT_TOP + PLOT_HEIGHT - y) / PLOT_HEIGHT) * axisTop;
        // Inlined: module-scope worklets break this file's Babel transform.
        const stepped = Math.round(raw / LIMIT_STEP) * LIMIT_STEP;
        const next = Math.min(maxLimit, Math.max(LIMIT_STEP, stepped));
        limitY.set(PLOT_TOP + (1 - next / axisTop) * PLOT_HEIGHT);
        // Cross to JS only when the snapped amount changes: one call per step rather than per frame.
        if (next !== snapped.get()) {
            snapped.set(next);
            scheduleOnRN(applyLimit, next);
        }
    };

    const pan = usePanGesture({
        minDistance: 0,
        onBegin: (event) => {
            "worklet";
            dragging.set(true);
            report(event.y);
        },
        onFinalize: () => {
            "worklet";
            dragging.set(false);
        },
        onUpdate: (event) => {
            "worklet";
            report(event.y);
        },
        shouldCancelWhenOutside: false,
    });

    const geometry = useMemo(() => {
        const plotLeft = PAD.left;
        const plotRight = width - PAD.right;
        const span = Math.max(1, burndown.totalDays - 1);
        const bottomY = PLOT_TOP + PLOT_HEIGHT;
        const x = (day: number) => plotLeft + ((day - 1) / span) * (plotRight - plotLeft);
        const y = (value: number) => yForLimit(value, axisTop);

        const curveD = curvePathD(burndown.points, x, y);
        const lastDay = burndown.points.at(-1)?.day ?? 1;
        const weeksD = weekRulesD(burndown.totalDays, x, PLOT_TOP, bottomY);

        return {
            area: `${curveD} L ${x(lastDay)} ${bottomY} L ${x(1)} ${bottomY} Z`,
            bottomY,
            curve: curveD,
            hatch: hatchPathD(width, CHART_HEIGHT),
            lastDay,
            plotLeft,
            plotRight,
            weeks: weeksD,
            x,
            y,
        };
    }, [burndown, width, axisTop]);

    const limitLineStart = useDerivedValue(() => vec(geometry.plotLeft, limitY.get()));
    const limitLineEnd = useDerivedValue(() => vec(geometry.plotRight, limitY.get()));
    const crossing = sparse ? null : crossingDay(cumulative, limit);
    const crossingDate =
        crossing == null
            ? null
            : new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate() + crossing - 1);
    const limitLabel = formatAmount(limit, currency, false, language);
    // Only over a sample of three or more that holds some spend; otherwise it is a sample size wearing a verdict.
    const sampled = history ?? [];
    const overCount = sampled.length >= 3 && sampled.some((spent) => spent > 0) ? windowsOver(sampled, limit) : null;
    const now = new Date(nowMs);
    const perDay = leftPerDay(limit - total, budgetWindow, now);
    const perDayLine = () => {
        if (limit <= 0) {
            return null;
        }
        if (limit > total) {
            return t("budgets.sheet.perDay", {
                // Cents below ten, or a day's allowance of $0.42 reads as "$0".
                amount: formatAmount(perDay, currency, perDay < 10, language),
                days: t("budgets.days", { count: daysLeftInWindow(budgetWindow, now) }),
            });
        }
        return t("budgets.sheet.alreadySpent", {
            amount: formatAmount(total, currency, false, language),
            over: formatAmount(total - limit, currency, false, language),
        });
    };

    let readout: string;
    if (sampleSize === 0) {
        readout = t("budgets.picker.nothingYet", { window: windowLabel });
    } else if (sparse) {
        readout =
            sampleSize < SPARSE_HISTORY
                ? t("budgets.picker.sparseExpenses", {
                      expenses: t("budgets.expenses", { count: sampleSize }),
                      window: windowLabel,
                  })
                : t("budgets.picker.sparseDays", {
                      days: t("budgets.days", { count: burndown.points.length }),
                      window: windowLabel,
                  });
    } else if (crossingDate && crossing != null) {
        const early = burndown.totalDays - crossing;
        readout =
            early > 0
                ? t("budgets.picker.ranOutEarly", {
                      date: formatDayMonth(crossingDate, language),
                      days: t("budgets.days", { count: early }),
                  })
                : t("budgets.picker.ranOutFinal", {
                      date: formatDayMonth(crossingDate, language),
                  });
    } else {
        readout = t("budgets.picker.held", {
            amount: formatAmount(limit - total, currency, showCents, language),
            window: windowLabel,
        });
    }

    const onLayout = (event: LayoutChangeEvent) => {
        setMeasured(event.nativeEvent.layout.width - GUTTER * 2);
    };

    // Clips read the committed value and the line the shared one; they differ only for a frame mid-drag.
    const limitYCommitted = yForLimit(Math.min(limit, maxLimit), axisTop);

    return (
        <View onLayout={onLayout} style={{ paddingHorizontal: GUTTER, width: "100%" }}>
            <View>
                <SheetDragRegion>
                    <GestureDetector gesture={pan}>
                        <View
                            accessibilityLabel={t("budgets.picker.dragA11y", {
                                amount: limitLabel,
                                period: periodPhrase,
                            })}
                            collapsable={false}
                            style={{ height: CHART_HEIGHT, width }}
                        >
                            {/* Skia's canvas swallows touches, so the wrapper's pan detector needs it to opt out. */}
                            <Canvas pointerEvents="none" style={{ height: CHART_HEIGHT, width }}>
                                {geometry.area ? (
                                    <SkPath color={withAlpha(colors.foreground, 0.06)} path={geometry.area} />
                                ) : null}

                                {geometry.area && geometry.hatch && total > limit ? (
                                    <SkGroup clip={geometry.area}>
                                        <SkGroup clip={{ height: limitYCommitted, width, x: 0, y: 0 }}>
                                            <SkPath
                                                color={withAlpha(colors.overBudget, 0.55)}
                                                path={geometry.hatch}
                                                strokeWidth={1.6}
                                                style="stroke"
                                            />
                                        </SkGroup>
                                    </SkGroup>
                                ) : null}

                                {geometry.weeks ? (
                                    <SkPath color={colors.muted} path={geometry.weeks} strokeWidth={1} style="stroke">
                                        <DashPathEffect intervals={[1.5, 4]} />
                                    </SkPath>
                                ) : null}

                                <SkPath
                                    color={colors.foreground}
                                    path={`M ${geometry.plotLeft} ${geometry.bottomY} L ${geometry.plotRight} ${geometry.bottomY}`}
                                    strokeWidth={1.6}
                                    style="stroke"
                                />

                                {/* One path drawn twice, clipped either side of the limit. */}
                                {geometry.curve ? (
                                    <>
                                        <SkGroup
                                            clip={{
                                                height: CHART_HEIGHT - limitYCommitted,
                                                width,
                                                x: 0,
                                                y: limitYCommitted,
                                            }}
                                        >
                                            <SkPath
                                                color={colors.foreground}
                                                path={geometry.curve}
                                                strokeWidth={2.2}
                                                style="stroke"
                                            />
                                        </SkGroup>
                                        <SkGroup clip={{ height: limitYCommitted, width, x: 0, y: 0 }}>
                                            <SkPath
                                                color={colors.overBudget}
                                                path={geometry.curve}
                                                strokeWidth={2.2}
                                                style="stroke"
                                            />
                                        </SkGroup>
                                    </>
                                ) : null}

                                {crossing == null ? null : (
                                    <SkPath
                                        color={withAlpha(colors.overBudget, 0.7)}
                                        path={`M ${geometry.x(crossing)} ${PLOT_TOP} L ${geometry.x(crossing)} ${geometry.bottomY}`}
                                        strokeWidth={1}
                                        style="stroke"
                                    >
                                        <DashPathEffect intervals={[3.5, 3.5]} />
                                    </SkPath>
                                )}

                                <SkCircle
                                    color={colors.foreground}
                                    cx={geometry.x(geometry.lastDay)}
                                    cy={geometry.y(total)}
                                    r={3.2}
                                />

                                <SkLine
                                    color={colors.foreground}
                                    p1={limitLineStart}
                                    p2={limitLineEnd}
                                    strokeWidth={1.6}
                                    style="stroke"
                                />
                                <SkCircle color={colors.foreground} cx={geometry.plotRight - 5} cy={limitY} r={5} />

                                {crossing == null ? null : (
                                    <SkCircle
                                        color={colors.overBudget}
                                        cx={geometry.x(crossing)}
                                        cy={limitY}
                                        r={3.6}
                                        strokeWidth={2}
                                        style="stroke"
                                    />
                                )}
                            </Canvas>
                        </View>
                    </GestureDetector>
                </SheetDragRegion>
            </View>

            <View className="flex-row items-baseline justify-between pt-2.5">
                <MonoLabel>{t("budgets.picker.drag")}</MonoLabel>
                <MonoLabel>
                    {t("budgets.picker.spent", {
                        amount: formatAmount(total, currency, false, language),
                    })}
                </MonoLabel>
            </View>

            <Text className="text-footnote text-muted pt-2.5">{readout}</Text>
            {overCount === null ? null : (
                <Text className="text-footnote text-muted pt-0.5">
                    {t("budgets.sheet.lastWindows", { over: overCount, total: sampled.length })}
                </Text>
            )}
            {perDayLine() ? <Text className="text-footnote text-muted pt-0.5 tabular-nums">{perDayLine()}</Text> : null}
        </View>
    );
}

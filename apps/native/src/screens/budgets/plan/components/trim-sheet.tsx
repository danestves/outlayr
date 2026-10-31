import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { SheetDragRegion } from "@/components/sheet-drag-region";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useYearPlan } from "@/data/budget-plans";
import type { PlanCategoryMeta } from "@/data/budget-plans";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { firstShortRun, isShort, trimEffect, trimMonths } from "@/domain/year-plan";
import type { MonthKey, MonthProjection } from "@/domain/year-plan";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { SheetCommitButton } from "../../components/sheet-commit-button";
import { monthName, monthRange, monthShort } from "../plan-copy";
import { Hatch, PlannedBar, planStep, SpentBar } from "./plan-bars";

export interface TrimTarget {
    categoryId: string;
    meta: PlanCategoryMeta;
    /** The month the sheet was opened from; the trim runs through it unless a short run reaches further. */
    viewedKey: MonthKey;
    year: number;
}

export interface TrimCommit {
    amounts: Map<MonthKey, number>;
    categoryId: string;
}

interface TrimSheetProps {
    db: Database;
    nowMs: number;
    onCommit: (commit: TrimCommit) => void;
    ref?: Ref<BottomSheetModal>;
    target: TrimTarget | null;
}

export function TrimSheet({ db, nowMs, onCommit, ref, target }: TrimSheetProps) {
    const sheetSurface = useSheetSurface();
    const [presentation, setPresentation] = useState(0);
    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => setPresentation((count) => count + 1)}
            ref={ref}
        >
            <SheetGestureRoot style={{}}>
                <BottomSheetView style={{ paddingBottom: 28, paddingTop: 14 }}>
                    {target ? (
                        <TrimBody
                            db={db}
                            key={`${target.categoryId}:${target.viewedKey}:${presentation}`}
                            nowMs={nowMs}
                            onCommit={onCommit}
                            target={target}
                        />
                    ) : null}
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

const STATED = "font-sans-medium text-[19px] leading-[28px] tracking-tight text-grammar";
const PLOT = 132;
const GUTTER = 20;
const COLUMN_GAP = 6;
const TRIM_FLOOR = 0.4;

function plannedOf(month: MonthProjection, categoryId: string): number {
    return month.categories.find((entry) => entry.categoryId === categoryId)?.planned ?? 0;
}

function actualOf(month: MonthProjection, categoryId: string): number {
    return month.categories.find((entry) => entry.categoryId === categoryId)?.actual ?? 0;
}

function TrimBody({
    db,
    nowMs,
    onCommit,
    target,
}: {
    db: Database;
    nowMs: number;
    onCommit: (commit: TrimCommit) => void;
    target: TrimTarget;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const colors = useColors();
    const { currency, input, projection } = useYearPlan(db, nowMs, target.year);
    const money = (value: number) => formatAmount(value, currency, false, language);
    const months = projection.months.filter((month) => month.status !== "closed");
    const { categoryId } = target;
    const fromKey = months[0]?.key ?? target.viewedKey;
    const viewed = months.find((month) => month.key >= target.viewedKey) ?? months[0];
    const was = viewed ? plannedOf(viewed, categoryId) : 0;

    const [opening] = useState(() => {
        const run = firstShortRun(projection);
        const through = run && run.to >= (viewed?.key ?? fromKey) ? run.to : (viewed?.key ?? fromKey);
        const deficit = Math.max(
            0,
            ...months.filter((month) => month.key <= through && isShort(month)).map((month) => -month.left)
        );
        const step = planStep(was);
        // Closing a large gap from one category would suggest zero; a trim someone would accept keeps some of it.
        const floor = Math.floor((was * TRIM_FLOOR) / step) * step;
        return { amount: Math.max(floor, Math.floor((was - deficit) / step) * step), through };
    });
    const [amount, setAmount] = useState(opening.amount);
    const [through, setThrough] = useState(opening.through);
    const [picking, setPicking] = useState(false);
    const [width, setWidth] = useState(0);

    const [axisTop] = useState(() =>
        Math.max(
            1,
            ...months.map((month) => Math.max(plannedOf(month, categoryId), actualOf(month, categoryId)) * 1.15)
        )
    );
    const step = planStep(axisTop);
    const y = (value: number) => (Math.min(value, axisTop) / axisTop) * PLOT;

    const snapped = useSharedValue(opening.amount);
    const applyAmount = (next: number) => {
        haptics("selection");
        setAmount(next);
    };
    const report = (eventY: number) => {
        "worklet";
        const raw = ((PLOT - eventY) / PLOT) * axisTop;
        const next = Math.min(Math.floor(axisTop / step) * step, Math.max(0, Math.round(raw / step) * step));
        // One crossing per snapped step, not per frame.
        if (next !== snapped.get()) {
            snapped.set(next);
            scheduleOnRN(applyAmount, next);
        }
    };
    const pan = usePanGesture({
        minDistance: 0,
        onBegin: (event) => {
            "worklet";
            report(event.y);
        },
        onUpdate: (event) => {
            "worklet";
            report(event.y);
        },
        shouldCancelWhenOutside: false,
    });

    if (!viewed) {
        return null;
    }

    const effect = trimEffect(input, projection, categoryId, amount, fromKey, through);
    const columnWidth = width > 0 ? (width - COLUMN_GAP * (months.length - 1)) / months.length : 0;
    const throughIndex = months.findIndex((month) => month.key === through);
    const lineRight = (throughIndex + 1) * columnWidth + throughIndex * COLUMN_GAP;

    const notes: string[] = [];
    if (effect.fixed.length === 1) {
        notes.push(t("budgets.plan.trim.fixedOne", { month: monthName(effect.fixed[0], language) }));
    } else if (effect.fixed.length > 1) {
        notes.push(
            t("budgets.plan.trim.fixedRange", {
                range: monthRange(effect.fixed[0], effect.fixed.at(-1) ?? effect.fixed[0], language, t),
            })
        );
    }
    if (effect.stillShort) {
        notes.push(
            t("budgets.plan.trim.stillShort", {
                by: money(effect.stillShort.by),
                month: monthName(effect.stillShort.key, language),
                spent: money(effect.stillShort.spent),
            })
        );
    }
    if (effect.freed >= 1) {
        notes.push(t("budgets.plan.trim.freed", { amount: money(effect.freed) }));
    }

    return (
        <View>
            <View className="px-5">
                <Sentence
                    slots={{
                        month: (
                            <Pressable
                                accessibilityLabel={t("budgets.plan.trim.monthA11y", {
                                    month: monthName(through, language),
                                })}
                                accessibilityRole="button"
                                accessibilityState={{ expanded: picking }}
                                onPress={() => setPicking((open) => !open)}
                            >
                                <Text className={cn(STATED, "text-tint border-tint border-b-[1.5px]")}>
                                    {monthName(through, language)}
                                </Text>
                            </Pressable>
                        ),
                        scope: (
                            <View className="flex-row items-center gap-1.5">
                                <CategoryIconTile
                                    color={target.meta.color ?? "#767676"}
                                    emoji={target.meta.emoji}
                                    icon={target.meta.icon}
                                    size={22}
                                />
                                <Text className={cn(STATED, "text-foreground")}>{target.meta.name ?? ""}</Text>
                            </View>
                        ),
                    }}
                    template={t("budgets.plan.trim.stated")}
                    textClassName={STATED}
                />

                {picking ? (
                    <Animated.View className="flex-row flex-wrap gap-2 pt-3.5" entering={revealEntering()}>
                        {months.map((month) => (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected: month.key === through }}
                                className={cn(
                                    "h-[38px] items-center justify-center rounded-[19px] border px-3.5",
                                    month.key === through ? "border-tint bg-tint/10" : "border-border"
                                )}
                                key={month.key}
                                onPress={() => {
                                    haptics("selection");
                                    setThrough(month.key);
                                    setPicking(false);
                                }}
                            >
                                <Text
                                    className={cn(
                                        "text-subtitle",
                                        month.key === through ? "text-tint" : "text-foreground"
                                    )}
                                >
                                    {monthShort(month.key, language)}
                                </Text>
                            </Pressable>
                        ))}
                    </Animated.View>
                ) : null}

                <View className="flex-row items-baseline justify-between pt-3">
                    <HeroNumber amount={amount} code={currency} showCents={false} sign="" size={40} still />
                    <MonoLabel>{t("budgets.plan.trim.was", { amount: money(was) })}</MonoLabel>
                </View>
            </View>

            <View
                onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - GUTTER * 2)}
                style={{ paddingHorizontal: GUTTER, paddingTop: 20 }}
            >
                <SheetDragRegion>
                    <GestureDetector gesture={pan}>
                        <View collapsable={false} style={{ height: PLOT }}>
                            <View className="flex-row items-end" style={{ gap: COLUMN_GAP, height: PLOT }}>
                                {months.map((month) => {
                                    const planned = plannedOf(month, categoryId);
                                    const inRange = month.key <= through;
                                    const shown = inRange ? amount : planned;
                                    const spent = month.status === "current" ? actualOf(month, categoryId) : 0;
                                    const solid = Math.min(spent, shown);
                                    const overSpent = Math.max(0, spent - shown);
                                    const trimmed = inRange ? Math.max(0, planned - Math.max(shown, spent)) : 0;
                                    return (
                                        <View key={month.key} style={{ height: PLOT, width: columnWidth }}>
                                            <View className="absolute inset-x-0 bottom-0">
                                                {trimmed > 0 ? (
                                                    <Hatch
                                                        color={withAlpha(colors.muted, 0.7)}
                                                        height={y(trimmed)}
                                                        width={columnWidth}
                                                    />
                                                ) : null}
                                                {trimmed > 0 && shown > spent ? (
                                                    <View style={{ height: y(shown - spent) }} />
                                                ) : null}
                                                {overSpent > 0 ? (
                                                    <Hatch
                                                        color={withAlpha(colors.overBudget, 0.8)}
                                                        height={y(overSpent)}
                                                        width={columnWidth}
                                                    />
                                                ) : null}
                                                {solid > 0 ? <SpentBar height={y(solid)} /> : null}
                                            </View>
                                            {shown > solid ? (
                                                <View className="absolute inset-x-0 bottom-0">
                                                    <PlannedBar height={y(shown)} />
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                            {columnWidth > 0 ? (
                                <View
                                    className="bg-foreground absolute left-0"
                                    pointerEvents="none"
                                    style={{ bottom: y(amount) - 0.75, height: 1.5, width: lineRight }}
                                />
                            ) : null}
                            {columnWidth > 0 ? (
                                <View
                                    className="bg-foreground absolute size-2.5 rounded-full"
                                    pointerEvents="none"
                                    style={{ bottom: y(amount) - 5, left: lineRight - 5 }}
                                />
                            ) : null}
                        </View>
                    </GestureDetector>
                </SheetDragRegion>
                <View className="bg-foreground h-px" />
                <View className="flex-row pt-1.5" style={{ gap: COLUMN_GAP }}>
                    {months.map((month) => (
                        <View className="items-center" key={month.key} style={{ width: columnWidth }}>
                            <MonoLabel
                                className={cn("text-micro", month.key <= through ? "text-foreground" : "text-subtle")}
                                numberOfLines={1}
                            >
                                {monthShort(month.key, language)}
                            </MonoLabel>
                        </View>
                    ))}
                </View>
                <View className="flex-row items-baseline justify-between pt-2.5">
                    <MonoLabel>{t("budgets.plan.trim.drag")}</MonoLabel>
                    {effect.freed >= 1 ? (
                        <MonoLabel>{t("budgets.plan.trim.saves", { amount: money(effect.freed) })}</MonoLabel>
                    ) : null}
                </View>
                {notes.map((note) => (
                    <Text className="text-footnote text-muted pt-1" key={note}>
                        {note}
                    </Text>
                ))}
            </View>

            <View className="px-5 pt-5">
                <SheetCommitButton
                    label={t("budgets.plan.trim.commit", {
                        amount: money(amount),
                        month: monthName(through, language),
                    })}
                    onPress={() => onCommit({ amounts: trimMonths(fromKey, through, amount), categoryId })}
                />
            </View>
        </View>
    );
}

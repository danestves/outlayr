import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { SheetDragRegion } from "@/components/sheet-drag-region";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useYearPlan } from "@/data/budget-plans";
import type { PlanCategoryMeta } from "@/data/budget-plans";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { aboveTypical, editorMonths, overPlan } from "@/domain/year-plan";
import type { EditorMonth, MonthKey } from "@/domain/year-plan";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { CHART_BAR } from "@/theme/chart";

import { EditorRow } from "../../components/editor-row";
import { EditorSwitch } from "../../components/editor-switch";
import { SheetCommitButton } from "../../components/sheet-commit-button";
import { monthName, monthRange, monthShort } from "../plan-copy";
import { PlannedBar, planStep, SpentBar } from "./plan-bars";

export interface PlanEditorTarget {
    categoryId: string;
    meta: PlanCategoryMeta;
    year: number;
}

export interface PlanEditorCommit {
    amounts: Map<MonthKey, number>;
    categoryId: string;
}

interface PlanEditorSheetProps {
    db: Database;
    nowMs: number;
    onCommit: (commit: PlanEditorCommit) => void;
    ref?: Ref<BottomSheetModal>;
    target: PlanEditorTarget | null;
}

export function PlanEditorSheet({ db, nowMs, onCommit, ref, target }: PlanEditorSheetProps) {
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
                        <PlanEditorYear
                            db={db}
                            key={`${target.categoryId}:${presentation}`}
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

/** Switching the year remounts the body, so drafts never carry from one year into the other. */
function PlanEditorYear(props: {
    db: Database;
    nowMs: number;
    onCommit: (commit: PlanEditorCommit) => void;
    target: PlanEditorTarget;
}) {
    const [year, setYear] = useState(props.target.year);
    return <PlanEditorBody {...props} key={year} onYear={setYear} year={year} />;
}

const STATED = "font-sans-medium text-[19px] leading-[28px] tracking-tight text-grammar";
const PLOT = 120;
const GUTTER = 20;
const COLUMN_GAP = 4;
const LABEL_ROOM = 16;

function PlanEditorBody({
    db,
    nowMs,
    onCommit,
    onYear,
    target,
    year,
}: {
    db: Database;
    nowMs: number;
    onCommit: (commit: PlanEditorCommit) => void;
    onYear: (year: number) => void;
    target: PlanEditorTarget;
    year: number;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const { currency, projection } = useYearPlan(db, nowMs, year);
    const money = (value: number) => formatAmount(value, currency, false, language);
    const { categoryId } = target;
    const opened = editorMonths(projection, categoryId);
    const thisYear = new Date(nowMs).getFullYear();
    const typical = projection.typical.get(categoryId) ?? null;

    const [values, setValues] = useState(() => new Map(opened.map((month) => [month.key, month.value])));
    const [touched, setTouched] = useState<MonthKey | null>(null);
    const [same, setSame] = useState(false);
    const [width, setWidth] = useState(0);
    const [axisTop] = useState(() => Math.max(10, ...opened.map((month) => month.value * 1.25), (typical ?? 0) * 1.5));
    const step = planStep(axisTop);
    const editable = opened.filter((month) => !month.locked);
    const months: EditorMonth[] = opened.map((month) => ({ ...month, value: values.get(month.key) ?? month.value }));

    const setMonth = (index: number, next: number) => {
        const month = opened[index];
        if (!month || month.locked) {
            return;
        }
        haptics("selection");
        setTouched(month.key);
        setValues((current) => {
            const draft = new Map(current);
            for (const candidate of same ? editable : [month]) {
                draft.set(candidate.key, next);
            }
            return draft;
        });
    };

    const columnWidth = width > 0 ? (width - COLUMN_GAP * 11) / 12 : 0;
    const lastPicked = useSharedValue(-1);
    const lastValue = useSharedValue(-1);
    const report = (eventX: number, eventY: number) => {
        "worklet";
        if (columnWidth <= 0) {
            return;
        }
        const index = Math.min(11, Math.max(0, Math.floor(eventX / (columnWidth + COLUMN_GAP))));
        const raw = ((PLOT - eventY) / PLOT) * axisTop;
        const next = Math.min(Math.floor(axisTop / step) * step, Math.max(0, Math.round(raw / step) * step));
        // One crossing per change of month or snapped step, not per frame.
        if (index !== lastPicked.get() || next !== lastValue.get()) {
            lastPicked.set(index);
            lastValue.set(next);
            scheduleOnRN(setMonth, index, next);
        }
    };
    const pan = usePanGesture({
        minDistance: 0,
        onBegin: (event) => {
            "worklet";
            report(event.x, event.y);
        },
        onFinalize: () => {
            "worklet";
            lastPicked.set(-1);
            lastValue.set(-1);
        },
        onUpdate: (event) => {
            "worklet";
            report(event.x, event.y);
        },
        shouldCancelWhenOutside: false,
    });

    const total = months.reduce((sum, month) => sum + month.value, 0);
    const y = (value: number) => Math.max(CHART_BAR.minHeight, (Math.min(value, axisTop) / axisTop) * PLOT);
    const closed = opened.filter((month) => month.locked);
    const copySource = touched ?? editable[0]?.key ?? null;
    const copyTargets = copySource === null ? [] : editable.filter((month) => month.key > copySource);

    const notes: string[] = [];
    const high = aboveTypical(months, typical);
    if (high) {
        notes.push(
            t("budgets.plan.editor.aboveTypical", { amount: money(high.by), month: monthName(high.key, language) })
        );
    }
    const over = overPlan(opened);
    if (over) {
        notes.push(t("budgets.plan.editor.overPlan", { amount: money(over.by), month: monthName(over.key, language) }));
    }

    const commit = () => {
        const amounts = new Map<MonthKey, number>();
        for (const month of editable) {
            const value = values.get(month.key) ?? month.value;
            if (value !== month.value || month.source !== "plan") {
                amounts.set(month.key, value);
            }
        }
        onCommit({ amounts, categoryId });
    };

    let closedLabel: string | null = null;
    if (closed.length > 0) {
        const first = closed[0].key;
        const last = closed.at(-1)?.key ?? first;
        closedLabel =
            closed.length <= 2
                ? closed.map((month) => monthShort(month.key, language)).join(", ")
                : t("budgets.plan.range", { from: monthShort(first, language), to: monthShort(last, language) });
    }

    return (
        <View>
            <View className="px-5">
                <Sentence
                    slots={{
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
                        year: (
                            <Pressable
                                accessibilityLabel={t("budgets.plan.editor.yearA11y", { year })}
                                accessibilityRole="button"
                                onPress={() => onYear(year === thisYear ? thisYear + 1 : thisYear)}
                            >
                                <Text className={cn(STATED, "text-tint border-tint border-b-[1.5px]")}>
                                    {String(year)}
                                </Text>
                            </Pressable>
                        ),
                    }}
                    template={t("budgets.plan.editor.stated")}
                    textClassName={STATED}
                />
                <View className="flex-row items-baseline justify-between pt-3">
                    <HeroNumber amount={total} code={currency} showCents={false} sign="" size={40} still />
                    {typical === null ? null : (
                        <MonoLabel>{t("budgets.plan.editor.typical", { amount: money(typical) })}</MonoLabel>
                    )}
                </View>
            </View>

            <View
                onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - GUTTER * 2)}
                style={{ paddingHorizontal: GUTTER, paddingTop: 16 }}
            >
                <SheetDragRegion>
                    <GestureDetector gesture={pan}>
                        <View
                            className="flex-row items-end"
                            collapsable={false}
                            style={{ gap: COLUMN_GAP, height: PLOT + LABEL_ROOM }}
                        >
                            {months.map((month) => {
                                const picked = month.key === touched;
                                return (
                                    <View className="items-center" key={month.key} style={{ width: columnWidth }}>
                                        <Text
                                            className={cn(
                                                "font-mono text-[9px] tabular-nums",
                                                picked ? "text-tint" : "text-muted"
                                            )}
                                            numberOfLines={1}
                                        >
                                            {month.value > 0 ? String(Math.round(month.value)) : " "}
                                        </Text>
                                        <View className="w-full pt-0.5">
                                            {month.locked ? (
                                                <SpentBar height={y(month.value)} />
                                            ) : (
                                                <PlannedBar height={y(month.value)} tinted={picked} />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </GestureDetector>
                </SheetDragRegion>
                <View className="bg-foreground h-px" />
                <View className="flex-row pt-1.5" style={{ gap: COLUMN_GAP }}>
                    {months.map((month) => (
                        <View className="items-center" key={month.key} style={{ width: columnWidth }}>
                            <MonoLabel className="text-micro text-subtle">
                                {monthShort(month.key, language).slice(0, 1)}
                            </MonoLabel>
                        </View>
                    ))}
                </View>
                <View className="flex-row items-baseline justify-between pt-2.5">
                    <MonoLabel>{t("budgets.plan.editor.drag")}</MonoLabel>
                    {closedLabel ? (
                        <MonoLabel>{t("budgets.plan.editor.spent", { months: closedLabel })}</MonoLabel>
                    ) : null}
                </View>
                {notes.map((note) => (
                    <Text className="text-footnote text-muted pt-1" key={note}>
                        {note}
                    </Text>
                ))}
            </View>

            <View className="px-5 pt-4">
                {copySource !== null && copyTargets.length > 0 ? (
                    <EditorRow
                        label={t("budgets.plan.editor.copyForward", { month: monthName(copySource, language) })}
                        onPress={() => {
                            const value = values.get(copySource) ?? 0;
                            haptics("light");
                            setValues((current) => {
                                const draft = new Map(current);
                                for (const month of copyTargets) {
                                    draft.set(month.key, value);
                                }
                                return draft;
                            });
                        }}
                        value={monthRange(
                            copyTargets[0].key,
                            copyTargets.at(-1)?.key ?? copyTargets[0].key,
                            language,
                            t
                        )}
                    />
                ) : null}
                <View className="border-border border-b py-3.5">
                    <View className="flex-row items-center gap-3">
                        <Text className="text-body text-foreground flex-1">
                            {t("budgets.plan.editor.sameEveryMonth")}
                        </Text>
                        <EditorSwitch
                            accessibilityLabel={t("budgets.plan.editor.sameEveryMonth")}
                            onValueChange={(next) => {
                                setSame(next);
                                const source = copySource === null ? null : (values.get(copySource) ?? null);
                                if (next && source !== null) {
                                    setValues((current) => {
                                        const draft = new Map(current);
                                        for (const month of editable) {
                                            draft.set(month.key, source);
                                        }
                                        return draft;
                                    });
                                }
                            }}
                            value={same}
                        />
                    </View>
                </View>
            </View>

            <View className="px-5 pt-5">
                <SheetCommitButton label={t("budgets.plan.editor.save", { year })} onPress={commit} />
            </View>
        </View>
    );
}

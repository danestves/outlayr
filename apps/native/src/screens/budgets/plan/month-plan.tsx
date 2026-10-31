import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { HeroNumber } from "@/components/amount-text";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import type { CategoryPickerSheetRef } from "@/components/category-picker-sheet";
import { MeasureStrip } from "@/components/import-sheet/measure-strip";
import { MonoLabel } from "@/components/mono-label";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useYearPlan } from "@/data/budget-plans";
import type { PlanCategoryMeta, YearPlan } from "@/data/budget-plans";
import type { Category } from "@/data/categories-core";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { buildBurndown } from "@/domain/budget-burndown";
import { leftPerDay } from "@/domain/budget-math";
import { formatTargetMonth, monthAbbrevTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { monthKeyAt, monthKeyParts, shiftMonthKey } from "@/domain/year-plan";
import type { CategoryMonth, MonthKey, MonthProjection } from "@/domain/year-plan";
import { useLanguage, useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { setPlanMonthsCommand } from "@/state/planning-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { BudgetBurndownChart } from "../components/budget-burndown-chart";
import { BudgetPeriodStepper } from "../components/budget-period-stepper";
import { useCommitLatch } from "../components/use-commit-latch";
import { PlanAddCell, PlanCell } from "./components/plan-cell";
import type { PlanCellProps } from "./components/plan-cell";
import { PlanEditorSheet } from "./components/plan-editor-sheet";
import type { PlanEditorTarget } from "./components/plan-editor-sheet";
import { PlanGrid } from "./components/plan-grid";
import { TrimSheet } from "./components/trim-sheet";
import type { TrimTarget } from "./components/trim-sheet";
import { categoryName, monthName } from "./plan-copy";

const CHART_BLEED = 8;
const CHART_HEIGHT = 150;
/** A year either side of today: far enough to plan next January, near enough to stay meaningful. */
const STEP_RANGE = 12;

type Cell =
    | { kind: "entry"; entry: CategoryMonth }
    | { kind: "goal"; goalId: string; amount: number }
    | { kind: "add" };

const cellKey = (cell: Cell) => {
    if (cell.kind === "entry") {
        return cell.entry.categoryId;
    }
    return cell.kind === "goal" ? cell.goalId : "add";
};

export function MonthPlan({ db, monthKey: openedKey }: { db: Database; monthKey: MonthKey }) {
    const nowMs = useNow();
    const [key, setKey] = useState(openedKey);
    const plan = useYearPlan(db, nowMs, monthKeyParts(key).year);
    const month = plan.projection.months.find((candidate) => candidate.key === key);
    if (!month) {
        return <View className="bg-background flex-1" />;
    }
    return <MonthPlanView db={db} month={month} nowMs={nowMs} onKey={setKey} plan={plan} />;
}

function MonthPlanView({
    db,
    month,
    nowMs,
    onKey,
    plan,
}: {
    db: Database;
    month: MonthProjection;
    nowMs: number;
    onKey: (key: MonthKey) => void;
    plan: YearPlan;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const { showCents } = useDisplaySettings().state;
    const { categories, currency, goals, input, projection } = plan;
    const money = (value: number) => formatAmount(value, currency, false, language);
    const now = new Date(nowMs);
    const [measured, setMeasured] = useState(0);
    const latch = useCommitLatch();
    const editorRef = useRef<BottomSheetModal>(null);
    const trimRef = useRef<BottomSheetModal>(null);
    const pickerRef = useRef<CategoryPickerSheetRef>(null);
    const [editorTarget, setEditorTarget] = useState<PlanEditorTarget | null>(null);
    const [trimTarget, setTrimTarget] = useState<TrimTarget | null>(null);
    const [pickingIncome, setPickingIncome] = useState(false);
    const { year } = monthKeyParts(month.key);

    const save = useAtomAction(
        setPlanMonthsCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to save the plan", Cause.squash(cause));
                notifyFailure({ body: t("budgets.plan.failedBody"), title: t("budgets.plan.failedTitle") });
            },
            onSettled: latch.release,
            onSuccess: () => haptics("success"),
        },
        SILENT
    );
    const commit = (categoryId: string, amounts: Map<MonthKey, number>, sheet: BottomSheetModal | null) => {
        if (!latch.hold()) {
            return;
        }
        sheet?.dismiss();
        if (amounts.size === 0) {
            latch.release();
            return;
        }
        save({ db, plan: { amounts, categoryId, currency } });
    };

    const openEditor = (meta: PlanCategoryMeta) => {
        setEditorTarget({ categoryId: meta.id, meta, year });
        requestAnimationFrame(() => editorRef.current?.present());
    };
    const openTrim = (meta: PlanCategoryMeta) => {
        setTrimTarget({ categoryId: meta.id, meta, viewedKey: month.key, year });
        requestAnimationFrame(() => trimRef.current?.present());
    };
    const pickCategory = (picked: Category) => {
        pickerRef.current?.dismiss();
        const meta = categories.get(picked.parentId ?? picked.id) ?? categories.get(picked.id);
        if (meta?.plannable) {
            openEditor(meta);
        }
    };

    const currentKey = monthKeyAt(now, input.firstDayOfMonth);
    const offset =
        (year - monthKeyParts(currentKey).year) * 12 +
        monthKeyParts(month.key).monthIndex -
        monthKeyParts(currentKey).monthIndex;
    const short = month.left < 0;
    const planned = month.outPlanned + month.setAside;
    const percent = month.in > 0 ? Math.round(((month.out + month.setAside) / month.in) * 100) : null;
    let heroLabel: string;
    if (month.status === "closed") {
        heroLabel = short ? t("budgets.plan.hero.closedShort") : t("budgets.plan.hero.closedLeft");
    } else if (month.status === "current") {
        heroLabel = short ? t("budgets.plan.hero.currentShort") : t("budgets.plan.hero.currentLeft");
    } else {
        heroLabel = short ? t("budgets.plan.hero.aheadShort") : t("budgets.plan.hero.aheadLeft");
    }

    const spending = input.flows
        .filter((flow) => !flow.income)
        .map((flow) => ({ amount: flow.amount, categoryId: flow.categoryId, date: flow.date, parentId: null }));
    const burndown =
        month.status === "ahead"
            ? null
            : {
                  ...buildBurndown(spending, { limit: month.in, now, window: month.window }),
                  projectedBalance: month.status === "current" ? month.left : null,
              };

    const incomeEntries = month.categories.filter((entry) => entry.income);
    const outEntries = month.categories.filter((entry) => !entry.income);

    const menuFor = (meta: PlanCategoryMeta): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                icon: "calendar",
                id: "plan",
                label: t("budgets.plan.action.plan", { year }),
                onPress: () => openEditor(meta),
            },
        ];
        if (!meta.income && month.status !== "closed") {
            items.push({
                icon: "scissors",
                id: "trim",
                label: t("budgets.plan.action.trim"),
                onPress: () => openTrim(meta),
            });
        }
        return items;
    };

    const entryCell = (entry: CategoryMonth, right: boolean, width: number | null) => {
        const meta = categories.get(entry.categoryId);
        const props: Omit<PlanCellProps, "right" | "width"> = {
            amount: entry.projected,
            barColor: meta?.color,
            caption: entry.planned > 0 ? t("budgets.ofLimit", { limit: money(entry.planned) }) : "",
            currency,
            fill: entry.planned > 0 ? entry.actual / entry.planned : 0,
            label: categoryName(meta, t),
            suffix: t("budgets.plan.suffix.planned"),
        };
        if (month.status === "ahead") {
            const typical = projection.typical.get(entry.categoryId);
            props.caption = typical === undefined ? "" : t("budgets.sheet.typical", { amount: money(typical) });
        } else if (entry.income) {
            const arrived = input.flows.findLast(
                (flow) =>
                    flow.income &&
                    flow.categoryId === entry.categoryId &&
                    flow.date >= month.window.start &&
                    flow.date < month.window.end
            )?.date;
            props.amount = entry.actual;
            props.suffix = t("budgets.plan.suffix.in");
            props.tone = "income";
            if (arrived) {
                props.caption = t("budgets.plan.arrived", {
                    date: `${arrived.getDate()} ${monthAbbrevTitle(arrived, language)}`,
                });
            }
        } else if (month.status === "closed") {
            props.amount = entry.actual;
            props.suffix = t("budgets.plan.suffix.spent");
            props.tone = entry.planned > 0 && entry.actual > entry.planned + 0.5 ? "short" : "plain";
        } else if (entry.actual > entry.planned + 0.5) {
            props.amount = entry.actual - entry.planned;
            props.suffix = t("budgets.suffix.over");
            props.tone = "short";
        } else if (entry.planned > 0 && entry.actual >= entry.planned - 0.5) {
            props.amount = entry.actual;
            props.suffix = t("budgets.plan.suffix.paid");
        } else {
            props.amount = entry.planned - entry.actual;
            props.suffix = t("budgets.suffix.left");
            const perDay = leftPerDay(entry.planned - entry.actual, month.window, now);
            props.caption = [props.caption, t("budgets.perDay", { amount: money(perDay) })].filter(Boolean).join(" · ");
        }
        return (
            <PlanCell
                {...props}
                key={entry.categoryId}
                menuItems={meta?.plannable ? menuFor(meta) : undefined}
                onPress={meta?.plannable ? () => openEditor(meta) : undefined}
                right={right}
                width={width}
            />
        );
    };

    const renderCell = (cell: Cell, right: boolean, width: number | null, incomeSide: boolean) => {
        if (cell.kind === "entry") {
            return entryCell(cell.entry, right, width);
        }
        if (cell.kind === "goal") {
            const goal = goals.get(cell.goalId);
            return (
                <PlanCell
                    amount={cell.amount}
                    caption={
                        goal
                            ? t("budgets.plan.goalBy", {
                                  date: formatTargetMonth(goal.targetDate, language),
                                  target: money(goal.target),
                              })
                            : ""
                    }
                    currency={currency}
                    fill={0}
                    key={cell.goalId}
                    label={goal?.name ?? ""}
                    right={right}
                    suffix={t("budgets.plan.suffix.perMonth")}
                    width={width}
                />
            );
        }
        return (
            <PlanAddCell
                key="add"
                label={incomeSide ? t("budgets.plan.addIncome") : t("budgets.plan.addSpending")}
                onPress={() => {
                    setPickingIncome(incomeSide);
                    requestAnimationFrame(() => pickerRef.current?.present());
                }}
                right={right}
                width={width}
            />
        );
    };

    const progress = (actual: number, target: number) =>
        month.status === "ahead" ? money(target) : `${money(actual)} ${t("budgets.ofLimit", { limit: money(target) })}`;

    return (
        <>
            <ScreenHeader title={monthName(month.key, language)} />
            <ScrollView
                className="bg-background"
                contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 20 }}
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1 }}
            >
                <View onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}>
                    <View className="flex-row items-baseline justify-between">
                        <MonoLabel>{t("budgets.plan.monthPlan", { month: monthName(month.key, language) })}</MonoLabel>
                        {percent === null ? null : <MonoLabel>{t("budgets.plan.ofIncome", { percent })}</MonoLabel>}
                    </View>
                    <View className="pt-2">
                        <HeroNumber
                            amount={Math.abs(month.left)}
                            code={currency}
                            showCents={showCents}
                            sign=""
                            size={48}
                            toneClass={short ? "text-over-budget" : "text-foreground"}
                        />
                    </View>
                    <Text className="text-footnote text-muted pt-0.5">{heroLabel}</Text>

                    {burndown && measured > 0 && month.in > 0 ? (
                        <View className="pt-4" style={{ marginHorizontal: -CHART_BLEED }}>
                            <BudgetBurndownChart
                                burndown={burndown}
                                height={CHART_HEIGHT}
                                limit={month.in}
                                width={measured + CHART_BLEED * 2}
                            />
                        </View>
                    ) : null}

                    <View className="pt-3.5">
                        <MeasureStrip
                            cells={[
                                { figure: money(month.in), key: "in", label: t("budgets.plan.measure.in") },
                                { figure: money(planned), key: "planned", label: t("budgets.plan.measure.planned") },
                                { figure: money(month.outActual), key: "spent", label: t("budgets.measure.spent") },
                            ]}
                        />
                    </View>

                    <View className="border-border border-b py-3">
                        <BudgetPeriodStepper
                            label={`${monthName(month.key, language)} ${year}`}
                            maxBack={STEP_RANGE}
                            maxForward={STEP_RANGE}
                            offset={offset}
                            onStep={(next) => onKey(shiftMonthKey(currentKey, next))}
                            type={BUDGET_TYPE.month}
                            window={month.window}
                        />
                    </View>

                    <SectionHeader
                        figure={progress(month.inActual, month.inPlanned)}
                        label={t("budgets.plan.measure.in")}
                    />
                    <PlanGrid<Cell>
                        items={[
                            ...byProjection(incomeEntries).map((entry) => ({ entry, kind: "entry" as const })),
                            { kind: "add" },
                        ]}
                        keyOf={cellKey}
                        renderCell={(cell, right, width) => renderCell(cell, right, width, true)}
                    />

                    <SectionHeader
                        figure={progress(month.outActual, month.outPlanned)}
                        label={t("budgets.plan.measure.out")}
                    />
                    <PlanGrid<Cell>
                        items={[
                            ...byProjection(outEntries).map((entry) => ({ entry, kind: "entry" as const })),
                            { kind: "add" },
                        ]}
                        keyOf={cellKey}
                        renderCell={(cell, right, width) => renderCell(cell, right, width, false)}
                    />

                    {month.goals.length > 0 ? (
                        <>
                            <SectionHeader figure={money(month.setAside)} label={t("budgets.plan.measure.setAside")} />
                            <PlanGrid<Cell>
                                items={month.goals.map((goal) => ({
                                    amount: goal.amount,
                                    goalId: goal.goalId,
                                    kind: "goal" as const,
                                }))}
                                keyOf={cellKey}
                                renderCell={(cell, right, width) => renderCell(cell, right, width, false)}
                            />
                        </>
                    ) : null}
                </View>
            </ScrollView>

            <PlanEditorSheet
                db={db}
                nowMs={nowMs}
                onCommit={({ amounts, categoryId }) => commit(categoryId, amounts, editorRef.current)}
                ref={editorRef}
                target={editorTarget}
            />
            <TrimSheet
                db={db}
                nowMs={nowMs}
                onCommit={({ amounts, categoryId }) => commit(categoryId, amounts, trimRef.current)}
                ref={trimRef}
                target={trimTarget}
            />
            <CategoryPickerSheet
                db={db}
                income={pickingIncome}
                onSelect={pickCategory}
                ref={pickerRef}
                selectedId={null}
            />
        </>
    );
}

const byProjection = (entries: readonly CategoryMonth[]) => [...entries].sort((a, b) => b.projected - a.projected);

function SectionHeader({ figure, label }: { figure: string | null; label: string }) {
    return (
        <View className="flex-row items-baseline justify-between pt-6 pb-2">
            <MonoLabel>{label}</MonoLabel>
            {figure ? <MonoLabel>{figure}</MonoLabel> : null}
        </View>
    );
}

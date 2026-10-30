import { SectionList } from "@legendapp/list/section-list";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HeroNumber } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { EmptyState, useMark } from "@/components/empty-state";
import { MeasureStrip } from "@/components/import-sheet/measure-strip";
import type { MeasureStripCell } from "@/components/import-sheet/measure-strip";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { usePendingCuotas } from "@/data/installment-reads";
import type { TransactionWithCategory } from "@/data/transactions";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import type { Burndown } from "@/domain/budget-burndown";
import { monthAbbrev } from "@/domain/dates";
import { groupByDay } from "@/domain/day-sections";
import { formatAmount } from "@/domain/money";
import { coverageNote, coverageOf } from "@/domain/valuation-coverage";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

import { BudgetBurndownChart } from "./budget-burndown-chart";
import { HeroVerdict } from "./budget-burndown-hero";
import { InlineEditorKeyboard } from "./inline-editor-keyboard";

interface BudgetDetailViewProps {
    amount: number;
    burndown: Burndown | null;
    closed?: boolean;
    currency: string;
    editor?: ReactNode;
    leftover: number;
    leftPerDayAmount?: number | null;
    onPressTransaction: (id: string) => void;
    overBudget: boolean;
    period: string;
    spent: number;
    stepper?: ReactNode;
    transactions: TransactionWithCategory[];
    window: BudgetWindow;
}

const CHART_BLEED = 8;
const CHART_HEIGHT = 150;

export function BudgetDetailView({
    period,
    spent,
    amount,
    burndown,
    editor,
    leftover,
    overBudget,
    currency,
    transactions,
    onPressTransaction,
    leftPerDayAmount = null,
    closed = false,
    stepper = null,
    window,
}: BudgetDetailViewProps) {
    const t = useTranslation();
    const db = useDatabase();
    const { displayCurrency, rates } = useValuation(db);
    const nowMs = useNow();
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const pendingCuotas = usePendingCuotas(db, pendingId);
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    const rows = transactions.filter((row) => !goesWithPendingDelete(row, pendingId, pendingCuotas));
    const sections = groupByDay(rows, currency, rates);
    const note = coverageNote(coverageOf(transactions, displayCurrency, rates), t);

    return (
        <InlineEditorKeyboard>
            <SectionList
                // The editor's name field lives in the list header; without this the keyboard covers it.
                automaticallyAdjustKeyboardInsets
                className="bg-background flex-1"
                contentInsetAdjustmentBehavior="automatic"
                // `keyboardShouldPersistTaps` stays default so a tap outside blurs the field, which commits the name.
                keyboardDismissMode="on-drag"
                sections={sections}
                keyExtractor={(item) => item.id}
                stickySectionHeadersEnabled={false}
                recycleItems
                contentContainerClassName="px-5 pt-2 pb-safe-offset-10"
                ListHeaderComponent={
                    <BudgetSummary
                        editor={editor}
                        period={period}
                        spent={spent}
                        amount={amount}
                        burndown={burndown}
                        leftover={leftover}
                        overBudget={overBudget}
                        currency={currency}
                        leftPerDayAmount={leftPerDayAmount}
                        closed={closed}
                        note={note}
                        stepper={stepper}
                        window={window}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        body={closed ? t("budgets.detail.emptyClosed") : t("budgets.detail.emptyOpen")}
                        mark={<PeriodFloor closed={closed} />}
                        tier="inFlow"
                    />
                }
                renderSectionHeader={({ section }) => (
                    <DaySectionHeader section={section} first={sections[0] === section} />
                )}
                renderItem={({ item }) => (
                    <TransactionRow
                        transaction={item}
                        currency={currency}
                        rates={rates}
                        onPress={onPressTransaction}
                        menuItems={openRowActions(item, false)}
                    />
                )}
            />
        </InlineEditorKeyboard>
    );
}

function BudgetSummary({
    period,
    spent,
    amount,
    burndown,
    editor,
    leftover,
    overBudget,
    currency,
    leftPerDayAmount,
    closed,
    note,
    stepper,
    window,
}: {
    period: string;
    spent: number;
    amount: number;
    burndown: Burndown | null;
    leftover: number;
    overBudget: boolean;
    currency: string;
    leftPerDayAmount: number | null;
    closed: boolean;
    editor: ReactNode;
    note: string | null;
    stepper: ReactNode;
    window: BudgetWindow;
}) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const [measured, setMeasured] = useState(0);
    const [scrubDay, setScrubDay] = useState<number | null>(null);
    const scrubbed = scrubDay == null ? null : (burndown?.points[scrubDay - 1] ?? null);
    const balance = scrubbed ? scrubbed.balance : leftover;
    const over = scrubbed ? balance < 0 : overBudget;
    const shownSpent = scrubbed ? scrubbed.spent : spent;
    const spentPct = amount > 0 ? Math.round((shownSpent / amount) * 100) : 0;
    let label: string;
    if (closed) {
        label = over ? t("budgets.detail.overBudget") : t("budgets.detail.unspent");
    } else {
        label = over ? t("budgets.detail.overPeriod", { period }) : t("budgets.detail.leftPeriod", { period });
    }
    const scrubDate = scrubbed
        ? new Date(window.start.getFullYear(), window.start.getMonth(), window.start.getDate() + scrubbed.day - 1)
        : null;
    const scrubLabel = scrubDate ? `${scrubDate.getDate()} ${monthAbbrev(scrubDate, language)}` : null;
    const measures: MeasureStripCell[] = [
        { figure: formatAmount(amount, currency, false, language), key: "limit", label: t("budgets.measure.limit") },
        {
            figure: formatAmount(shownSpent, currency, false, language),
            key: "spent",
            label: t("budgets.measure.spent"),
        },
    ];
    if (leftPerDayAmount != null) {
        measures.push({
            figure: formatAmount(leftPerDayAmount, currency, leftPerDayAmount < 10, language),
            key: "perDay",
            label: t("budgets.measure.perDay"),
        });
    }

    return (
        <View onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}>
            <View className="flex-row items-baseline justify-between">
                <MonoLabel>{scrubLabel ?? period}</MonoLabel>
                <MonoLabel>{t("budgets.detail.percentSpent", { percent: spentPct })}</MonoLabel>
            </View>

            <View className="pt-2">
                <HeroNumber
                    amount={Math.abs(balance)}
                    code={currency}
                    sign=""
                    toneClass={over ? "text-over-budget" : "text-foreground"}
                    size={48}
                    showCents={showCents}
                />
            </View>
            <Text className="text-footnote text-muted pt-0.5">
                {scrubLabel ? t("budgets.hero.onDate", { date: scrubLabel, label }) : label}
            </Text>

            {burndown && measured > 0 ? (
                <View className="pt-4" style={{ marginHorizontal: -CHART_BLEED }}>
                    <BudgetBurndownChart
                        burndown={burndown}
                        height={CHART_HEIGHT}
                        limit={amount}
                        onScrub={setScrubDay}
                        width={measured + CHART_BLEED * 2}
                    />
                </View>
            ) : null}

            <View className="pt-3.5">
                <MeasureStrip cells={measures} />
            </View>

            {scrubbed ? null : <HeroVerdict burndown={burndown} currency={currency} />}

            {note ? <Text className="text-footnote text-muted pt-3">{note}</Text> : null}

            {stepper ? <View className="border-border border-b py-3">{stepper}</View> : null}

            {editor}

            <View className="pt-7">
                <MonoLabel>{t("budgets.detail.transactions")}</MonoLabel>
            </View>
        </View>
    );
}

const FLOOR_W = MARK_CEILING.inFlow;
const FLOOR_H = 40;

function PeriodFloor({ closed }: { closed: boolean }) {
    const ink = useMark();
    const colors = useColors();
    const floor = FLOOR_H - 12;
    const right = FLOOR_W - 2;
    const today = FLOOR_W * 0.55;

    return (
        <Svg height={FLOOR_H} viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`} width={FLOOR_W}>
            <Path d={`M4 4 V${floor} H${right}`} fill="none" stroke={ink.rule} strokeWidth={1} />
            <Path d={`M4 12 H${right}`} stroke={ink.rule} strokeDasharray="2 5" strokeWidth={1} />
            <Path
                d={`M4 ${floor} H${closed ? right : today}`}
                stroke={colors.foreground}
                strokeLinecap="round"
                strokeWidth={2}
            />
            {closed ? (
                <Path
                    d={`M4 ${floor + 5} V${floor + 10} M${right} ${floor + 5} V${floor + 10} M4 ${floor + 7.5} H${right}`}
                    stroke={ink.rule}
                    strokeWidth={1}
                />
            ) : (
                <>
                    <Path
                        d={`M${today} ${floor} H${right}`}
                        stroke={ink.edge}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                    />
                    <Path
                        d={`M${today} ${floor - 7} V${floor + 7}`}
                        stroke={colors.foreground}
                        strokeLinecap="round"
                        strokeWidth={1.5}
                    />
                </>
            )}
        </Svg>
    );
}

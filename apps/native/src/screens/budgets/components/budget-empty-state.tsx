import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EmptyState, useMark } from "@/components/empty-state";
import { Arrive } from "@/components/mark-motion";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

import { BudgetLimitBody } from "./budget-limit-body";
import type { LimitCommit } from "./budget-limit-body";

interface BudgetEmptyStateProps {
    calendar: { firstDayOfMonth: number; firstWeekday: number };
    contributions: readonly ExpenseContribution[];
    currency: string;
    nowMs: number;
    /** Goals live below the budgets, and this takeover renders instead of them. */
    onAddGoal: () => void;
    onAddTransaction: () => void;
    onCommit: (commit: LimitCommit) => void;
}

export function BudgetEmptyState({
    contributions,
    currency,
    nowMs,
    calendar,
    onAddGoal,
    onAddTransaction,
    onCommit,
}: BudgetEmptyStateProps) {
    const t = useTranslation();

    if (contributions.length === 0) {
        return <NothingToBudget onAddGoal={onAddGoal} onAddTransaction={onAddTransaction} />;
    }

    return (
        <>
            <BudgetLimitBody
                calendar={calendar}
                contributions={contributions}
                currency={currency}
                nowMs={nowMs}
                onCommit={onCommit}
                periodChoice={false}
                target={{
                    categoryId: null,
                    limit: null,
                    name: t("budgets.scope.everything").toLocaleLowerCase(),
                    type: BUDGET_TYPE.month,
                }}
            />
            <GoalWayOut onPress={onAddGoal} />
        </>
    );
}

function GoalWayOut({ onPress }: { onPress: () => void }) {
    const t = useTranslation();
    return (
        <Pressable accessibilityRole="button" className="items-center px-5 pt-4 active:opacity-60" onPress={onPress}>
            <Text className="text-tint text-subtitle">{t("goals.add")}</Text>
        </Pressable>
    );
}

function NothingToBudget({ onAddGoal, onAddTransaction }: { onAddGoal: () => void; onAddTransaction: () => void }) {
    const t = useTranslation();
    return (
        <EmptyState
            action={
                <View className="items-center gap-1">
                    <Pressable
                        accessibilityRole="button"
                        className="bg-accent rounded-full px-7 py-3.5 active:opacity-80"
                        onPress={onAddTransaction}
                    >
                        <Text className="font-sans-semibold text-accent-foreground text-body">
                            {t("budgets.empty.action")}
                        </Text>
                    </Pressable>
                    <GoalWayOut onPress={onAddGoal} />
                </View>
            }
            body={t("budgets.empty.body")}
            mark={<PlotUnset />}
            tier="takeover"
            title={t("budgets.empty.title")}
        />
    );
}

const PLOT_W = MARK_CEILING.takeover;
const PLOT_H = 128;

const LIMIT_DROP = -24;
const OVERLAY: ViewStyle = {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
};

function PlotUnset() {
    const ink = useMark();
    const colors = useColors();
    return (
        <View style={{ height: PLOT_H, width: PLOT_W }}>
            <Svg height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width={PLOT_W}>
                <Path d={`M14 6 V${PLOT_H - 16} H${PLOT_W - 4}`} fill="none" stroke={ink.rule} strokeWidth={1.5} />
                <Path
                    d={`M14 ${(PLOT_H - 16 + 30) / 2} H${PLOT_W - 4}`}
                    fill="none"
                    stroke={ink.rule}
                    strokeDasharray="2 7"
                    strokeWidth={1}
                />
                <Path
                    d={`M14 ${PLOT_H - 16} H${PLOT_W - 4}`}
                    stroke={colors.foreground}
                    strokeLinecap="round"
                    strokeWidth={3}
                />
            </Svg>
            <Arrive distance={LIMIT_DROP} style={OVERLAY}>
                <Svg height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width={PLOT_W}>
                    <Path
                        d={`M14 30 H${PLOT_W - 4}`}
                        fill="none"
                        stroke={ink.edge}
                        strokeDasharray="6 6"
                        strokeWidth={2}
                    />
                </Svg>
            </Arrive>
        </View>
    );
}

import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";

import { ActionMenu } from "@/components/action-menu";
import type { ActionMenuItem } from "@/components/action-menu";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { CategoryBudgetView } from "@/data/budgets";
import type { Burndown } from "@/domain/budget-burndown";
import { formatAmount } from "@/domain/money";
import { useOverBudgetMoment } from "@/hooks/use-over-budget-moment";
import { useLanguage, useTranslation } from "@/i18n/context";

import { timeLeftUnlessHeroShows } from "../time-left";
import { BudgetBurndownChart } from "./budget-burndown-chart";
import { BudgetDaySlots } from "./budget-day-slots";

interface BudgetCardProps {
    budget: CategoryBudgetView;
    burndown?: Burndown | null;
    contributions: readonly ExpenseContribution[];
    currency: string;
    heroTimeLeft: string | null;
    nowMs: number;
    menuItems: readonly ActionMenuItem[];
    onPress: (id: string) => void;
    /** Null on the first frame: the card offers no menu until then, since the menu's SwiftUI host has no flex. */
    width: number | null;
}

const THUMB_HEIGHT = 40;

/** No swipe-to-delete: at half a screen wide the gesture fights the scroll. Long press opens the same actions. */
export function BudgetCard({
    budget,
    currency,
    onPress,
    menuItems,
    burndown,
    contributions,
    heroTimeLeft,
    nowMs,
    width,
}: BudgetCardProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const [chartWidth, setChartWidth] = useState(0);
    const now = new Date(nowMs);
    const over = budget.overBudget;
    const crossedStyle = useOverBudgetMoment(budget.id, over, budget.window.start);
    const isDay = budget.type === BUDGET_TYPE.day;
    const difference = Math.abs(budget.leftover);
    const differenceLabel = formatAmount(difference, currency, showCents, language);

    const onLayout = (event: LayoutChangeEvent) => {
        setChartWidth(event.nativeEvent.layout.width);
    };

    const card = (
        <Pressable
            accessibilityLabel={
                over
                    ? t("budgets.card.a11yOver", {
                          amount: differenceLabel,
                          name: budget.name,
                      })
                    : t("budgets.card.a11yLeft", {
                          amount: differenceLabel,
                          name: budget.name,
                      })
            }
            accessibilityRole="button"
            className="border-border gap-2 rounded-xl border p-3 active:opacity-70"
            onPress={() => onPress(budget.id)}
            style={width === null ? { flex: 1 } : { width }}
        >
            <View className="flex-row items-center gap-2">
                <View className="size-2 rounded-full" style={{ backgroundColor: budget.color }} />
                <Text className="font-sans-semibold text-foreground text-subtitle flex-1" numberOfLines={1}>
                    {budget.name}
                </Text>
            </View>

            <Animated.View style={crossedStyle}>
                <Text
                    className={cn(
                        "tabular-nums",
                        "font-sans-semibold text-body",
                        over ? "text-over-budget" : "text-foreground"
                    )}
                    numberOfLines={1}
                >
                    {differenceLabel}
                    <Text className="font-sans-medium text-label text-muted">
                        {` ${over ? t("budgets.suffix.over") : t("budgets.suffix.left")}`}
                    </Text>
                </Text>
            </Animated.View>

            {isDay ? (
                <BudgetDaySlots
                    categoryId={budget.categoryId}
                    compact
                    contributions={contributions}
                    currency={currency}
                    limit={budget.amount}
                    nowMs={nowMs}
                    window={budget.window}
                />
            ) : null}

            {isDay || !burndown ? null : (
                <View onLayout={onLayout} style={{ height: THUMB_HEIGHT }}>
                    {chartWidth > 0 ? (
                        <BudgetBurndownChart
                            burndown={burndown}
                            height={THUMB_HEIGHT}
                            thumbnail
                            limit={budget.amount}
                            width={chartWidth}
                        />
                    ) : null}
                </View>
            )}

            <MonoLabel numberOfLines={1}>
                {[
                    t("budgets.spentOfLimit", {
                        limit: formatAmount(budget.amount, currency, false, language),
                        spent: formatAmount(budget.spent, currency, false, language),
                    }),
                    timeLeftUnlessHeroShows(budget, heroTimeLeft, now, t),
                ]
                    .filter(Boolean)
                    .join(" · ")}
            </MonoLabel>
        </Pressable>
    );

    return width === null ? (
        card
    ) : (
        <ActionMenu items={menuItems} style={{ width }}>
            {card}
        </ActionMenu>
    );
}

import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { ActionMenu } from "@/components/action-menu";
import type { ActionMenuItem } from "@/components/action-menu";
import { HeroNumber } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { CategoryBudgetView } from "@/data/budgets";
import { leftPerDay } from "@/domain/budget-math";
import { formatAmount } from "@/domain/money";
import { useOverBudgetMoment } from "@/hooks/use-over-budget-moment";
import { useLanguage, useTranslation } from "@/i18n/context";

import { timeLeftUnlessHeroShows } from "../time-left";

interface BudgetCardProps {
    budget: CategoryBudgetView;
    currency: string;
    heroTimeLeft: string | null;
    nowMs: number;
    menuItems: readonly ActionMenuItem[];
    onPress: (id: string) => void;
    right: boolean;
    /** Null on the first frame: the card offers no menu until then, since the menu's SwiftUI host has no flex. */
    width: number | null;
}

const FIGURE_SIZE = 26;
const CELL_INSET = 14;
const SUFFIX_ALLOWANCE = 40;

const cellClass = (right: boolean) =>
    cn("gap-1.5 pt-3 pb-4 active:opacity-70", right ? "border-border border-l pl-3.5" : "pr-3.5");

/** No swipe-to-delete: at half a screen wide the gesture fights the scroll. Long press opens the same actions. */
export function BudgetCard({
    budget,
    currency,
    onPress,
    menuItems,
    heroTimeLeft,
    nowMs,
    right,
    width,
}: BudgetCardProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const now = new Date(nowMs);
    const over = budget.overBudget;
    const crossedStyle = useOverBudgetMoment(budget.id, over, budget.window.start);
    const difference = Math.abs(budget.leftover);
    const differenceLabel = formatAmount(difference, currency, showCents, language);
    const perDay =
        over || budget.type === BUDGET_TYPE.day
            ? null
            : t("budgets.perDay", {
                  amount: formatAmount(leftPerDay(budget.leftover, budget.window, now), currency, false, language),
              });
    const meta = [
        t("budgets.ofLimit", { limit: formatAmount(budget.amount, currency, false, language) }),
        timeLeftUnlessHeroShows(budget, heroTimeLeft, now, t) ?? perDay,
    ]
        .filter(Boolean)
        .join(" · ");
    const filled = over ? budget.amount / budget.spent : budget.spent / (budget.amount || 1);

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
            className={cellClass(right)}
            onPress={() => onPress(budget.id)}
            style={width === null ? { flex: 1 } : { width }}
        >
            <MonoLabel numberOfLines={1}>{budget.name}</MonoLabel>

            <Animated.View className="flex-row items-baseline" style={crossedStyle}>
                <HeroNumber
                    amount={difference}
                    code={currency}
                    fitWidth={width === null ? undefined : width - CELL_INSET - SUFFIX_ALLOWANCE}
                    showCents={showCents}
                    sign=""
                    size={FIGURE_SIZE}
                    still
                    toneClass={over ? "text-over-budget" : "text-foreground"}
                />
                <Text className="text-label text-muted shrink" numberOfLines={1}>
                    {` ${over ? t("budgets.suffix.over") : t("budgets.suffix.left")}`}
                </Text>
            </Animated.View>

            <View className={cn("h-1 overflow-hidden rounded-full", over ? "bg-rail-over" : "bg-rail-track")}>
                <View
                    className={cn("h-full rounded-full", over && "bg-over-budget")}
                    style={[{ width: `${filled * 100}%` }, !over && { backgroundColor: budget.color }]}
                />
            </View>

            <MonoLabel numberOfLines={1}>{meta}</MonoLabel>
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

export function NewBudgetCell({
    onPress,
    right,
    width,
}: {
    onPress: () => void;
    right: boolean;
    width: number | null;
}) {
    const t = useTranslation();
    return (
        <Pressable
            accessibilityLabel={t("budgets.grid.new")}
            accessibilityRole="button"
            className={cn(cellClass(right), "justify-center")}
            onPress={onPress}
            style={width === null ? { flex: 1 } : { width }}
        >
            <Text className="text-title text-muted">+</Text>
            <MonoLabel>{t("budgets.grid.new")}</MonoLabel>
        </Pressable>
    );
}

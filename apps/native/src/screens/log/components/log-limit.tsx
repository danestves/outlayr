import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { use } from "react";
import { Pressable, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { MainBudgetView } from "@/data/budgets";
import { budgetPace, leftPerDay, overPace } from "@/domain/budget-math";
import { formatAmount, maskedAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

/** The overall budget under the Log total, only when it runs monthly. Amounts are in the ledger's currency. */
export function LogLimit({
    budget,
    currency,
    nowMs,
    onPress,
}: {
    budget: MainBudgetView | null;
    currency: string;
    nowMs: number;
    onPress: () => void;
}) {
    if (budget?.type !== BUDGET_TYPE.month) {
        return null;
    }
    return <MonthLimit budget={budget} currency={currency} nowMs={nowMs} onPress={onPress} />;
}

function MonthLimit({
    budget,
    currency,
    nowMs,
    onPress,
}: {
    budget: MainBudgetView;
    currency: string;
    nowMs: number;
    onPress: () => void;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const hidden = use(AmountsHiddenContext);
    const now = new Date(nowMs);
    const money = (amount: number, cents = showCents) =>
        hidden ? maskedAmount(currency) : formatAmount(amount, currency, cents, language);

    const over = budget.overBudget;
    const ahead = over ? 0 : overPace(budget.spent, budget.amount, budget.window, now);
    const filled = Math.min(1, budget.spent / (budget.amount || 1));
    const status = over
        ? t("log.limit.over", { amount: money(-budget.leftover) })
        : `${t("log.limit.left", { amount: money(budget.leftover) })} · ${t("budgets.perDay", {
              amount: money(leftPerDay(budget.leftover, budget.window, now), false),
          })}`;
    const limit = money(budget.amount, false);

    return (
        <Pressable
            accessibilityLabel={t("log.limit.a11y", { limit, status })}
            accessibilityRole="button"
            className="gap-1.5 pt-3"
            onPress={onPress}
        >
            <MonoLabel>{t("log.limit.label", { limit })}</MonoLabel>
            <View className="justify-center">
                <View className={cn("h-1 overflow-hidden rounded-full", over ? "bg-rail-over" : "bg-rail-track")}>
                    <View
                        className={cn("h-full rounded-full", over ? "bg-over-budget" : "bg-foreground")}
                        style={{ width: `${filled * 100}%` }}
                    />
                </View>
                {over ? null : (
                    <View
                        className="bg-muted absolute h-2.5 w-px"
                        style={{ left: `${budgetPace(budget.window, now).elapsed * 100}%` }}
                    />
                )}
            </View>
            <View className="flex-row justify-between gap-2">
                <Text className={cn("text-footnote tabular-nums", over ? "text-over-budget" : "text-muted")}>
                    {status}
                </Text>
                {ahead > 0 ? (
                    <Text className="text-footnote text-over-budget tabular-nums">
                        {t("log.limit.overPace", { amount: money(ahead, false) })}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

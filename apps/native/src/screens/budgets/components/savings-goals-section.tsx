import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { SavingsGoalWithProgress } from "@/data/savings-goals";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { GoalRow } from "./goal-row";

interface SavingsGoalsSectionProps {
    currency: string;
    goals: readonly SavingsGoalWithProgress[];
    onAdd: () => void;
    onPress: (id: string) => void;
}

export function SavingsGoalsSection({ goals, currency, onPress, onAdd }: SavingsGoalsSectionProps) {
    const t = useTranslation();
    const { language } = useLanguage();

    const ordered = goalsInOrder(goals);
    const outstanding = stillToFind(goals);

    return (
        <View className="pt-7">
            <View className="flex-row items-baseline justify-between">
                <MonoLabel>{t("goals.heading")}</MonoLabel>
                {outstanding > 0 ? (
                    <MonoLabel>
                        {t("goals.summary.toGo", { amount: formatAmount(outstanding, currency, false, language) })}
                    </MonoLabel>
                ) : null}
            </View>

            <View className="border-border mt-2 border-t">
                {ordered.map((entry) => (
                    <GoalRow currency={currency} entry={entry} key={entry.goal.id} onPress={onPress} />
                ))}
                <Pressable
                    accessibilityRole="button"
                    className="border-border flex-row items-center border-b py-3 active:opacity-60"
                    onPress={onAdd}
                >
                    <Text className="text-tint text-body flex-1">{t("goals.add")}</Text>
                </Pressable>
            </View>

            {goals.length === 0 ? (
                <Text className="text-footnote text-muted pt-2.5 leading-snug">{t("goals.empty.body")}</Text>
            ) : null}
        </View>
    );
}

/** Reached goals sink, but only `exact` ones: an incomparable goal has no verdict to file under. */
export function goalsInOrder(goals: readonly SavingsGoalWithProgress[]): SavingsGoalWithProgress[] {
    return [...goals].sort(
        (left, right) => Number(left.exact && left.progress.reached) - Number(right.exact && right.progress.reached)
    );
}

/** Goals on one account share its balance, so take the largest shortfall instead of summing. */
function stillToFind(goals: readonly SavingsGoalWithProgress[]): number {
    const byAccount = new Map<string, number>();
    for (const entry of goals) {
        // Incomparable currencies: the cards withhold this shortfall, so the total must too.
        if (!entry.exact) {
            continue;
        }
        const held = byAccount.get(entry.goal.accountId) ?? 0;
        byAccount.set(entry.goal.accountId, Math.max(held, entry.progress.remaining));
    }
    let total = 0;
    for (const shortfall of byAccount.values()) {
        total += shortfall;
    }
    return total;
}

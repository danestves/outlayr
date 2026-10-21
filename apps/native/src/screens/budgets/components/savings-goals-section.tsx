import { useState } from "react";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { SavingsGoalWithProgress } from "@/data/savings-goals";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { pairs } from "../pairs";
import { GoalCard } from "./goal-card";

const CARD_GUTTER = 12;

interface SavingsGoalsSectionProps {
    currency: string;
    goals: readonly SavingsGoalWithProgress[];
    onAdd: () => void;
    onPress: (id: string) => void;
}

export function SavingsGoalsSection({ goals, currency, onPress, onAdd }: SavingsGoalsSectionProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const [gridWidth, setGridWidth] = useState<number | null>(null);

    // Only `exact` goals sink: an incomparable goal has no verdict to file under.
    const ordered = [...goals].sort(
        (left, right) => Number(left.exact && left.progress.reached) - Number(right.exact && right.progress.reached)
    );
    const outstanding = stillToFind(goals);
    const cardWidth = gridWidth === null ? null : (gridWidth - CARD_GUTTER) / 2;

    return (
        <View className="pt-6">
            <View className="flex-row items-baseline justify-between pb-2.5">
                <MonoLabel>{t("goals.heading")}</MonoLabel>
                {outstanding > 0 ? (
                    <MonoLabel>
                        {t("goals.summary.toGo", { amount: formatAmount(outstanding, currency, false, language) })}
                    </MonoLabel>
                ) : null}
            </View>

            <View className="gap-3" onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
                {pairs(tiles(ordered)).map(([left, right]) => (
                    <View className="flex-row gap-3" key={left.key}>
                        <Tile currency={currency} onAdd={onAdd} onPress={onPress} tile={left} width={cardWidth} />
                        {right ? (
                            <Tile currency={currency} onAdd={onAdd} onPress={onPress} tile={right} width={cardWidth} />
                        ) : (
                            <View className="flex-1" />
                        )}
                    </View>
                ))}
            </View>

            {goals.length === 0 ? (
                <Text className="text-footnote text-muted pt-2.5 leading-snug">{t("goals.empty.body")}</Text>
            ) : null}
        </View>
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

function Tile({
    currency,
    onAdd,
    onPress,
    tile,
    width,
}: {
    currency: string;
    onAdd: () => void;
    onPress: (id: string) => void;
    tile: GridTile;
    width: number | null;
}) {
    return tile.entry ? (
        <GoalCard currency={currency} entry={tile.entry} onPress={onPress} width={width} />
    ) : (
        <AddGoalCard onPress={onAdd} width={width} />
    );
}

function AddGoalCard({ onPress, width }: { onPress: () => void; width: number | null }) {
    const t = useTranslation();
    return (
        <Pressable
            accessibilityRole="button"
            className="border-border items-center justify-center gap-1.5 rounded-2xl border border-dashed py-6 active:opacity-70"
            onPress={onPress}
            style={width === null ? { flex: 1 } : { width }}
        >
            <Text className="text-muted text-[22px] leading-[26px]">+</Text>
            <MonoLabel>{t("goals.add")}</MonoLabel>
        </Pressable>
    );
}

interface GridTile {
    entry: SavingsGoalWithProgress | null;
    key: string;
}

function tiles(goals: readonly SavingsGoalWithProgress[]): GridTile[] {
    return [...goals.map((entry) => ({ entry, key: entry.goal.id })), { entry: null, key: "add" }];
}

import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { useMemo } from "react";
import { View } from "react-native";

import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { buildDaySlots, dayVerdictSentence } from "@/domain/budget-day-slots";
import type { DaySlots } from "@/domain/budget-day-slots";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

interface BudgetDaySlotsProps {
    categoryId?: string | null;
    className?: string;
    compact?: boolean;
    contributions: readonly ExpenseContribution[];
    currency: string;
    limit: number;
    noun?: string;
    nowMs: number;
    tint?: string;
    window: BudgetWindow;
}

export function drawsDaySlots(slots: DaySlots): boolean {
    return slots.scale > 0 && (slots.blocks.length > 0 || slots.ghost != null);
}

const BLOCK_GAP = 2;
const RULE_OVERHANG = 3;

export function BudgetDaySlots({
    contributions,
    limit,
    window,
    nowMs,
    categoryId = null,
    currency,
    noun = "purchase",
    compact = false,
    className,
    tint,
}: BudgetDaySlotsProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const slots = useMemo(
        () =>
            buildDaySlots(contributions, {
                categoryId,
                limit,
                now: new Date(nowMs),
                window,
            }),
        [contributions, limit, window, nowMs, categoryId]
    );

    if (!drawsDaySlots(slots)) {
        return null;
    }

    const span = (value: number) => `${(value / slots.scale) * 100}%` as const;
    const sentence = dayVerdictSentence(slots, noun, t);

    return (
        <View className={cn(compact ? "pt-1.5" : "pt-4", className)}>
            <View style={{ height: compact ? 10 : 18 }}>
                {slots.blocks.map((block) => (
                    <View
                        key={`${block.start}-${block.amount}`}
                        style={{
                            bottom: 0,
                            left: span(block.start),
                            position: "absolute",
                            top: 0,
                            width: span(block.amount),
                        }}
                    >
                        <View
                            className={block.over ? "bg-over-budget" : "bg-foreground"}
                            style={[
                                { borderRadius: 2, flex: 1, marginRight: BLOCK_GAP },
                                block.over || tint === undefined ? null : { backgroundColor: tint },
                            ]}
                        />
                    </View>
                ))}

                {slots.ghost == null ? null : (
                    <View
                        style={{
                            bottom: 0,
                            left: span(slots.spent),
                            position: "absolute",
                            top: 0,
                            width: span(slots.ghost),
                        }}
                    >
                        <View
                            className="border-muted"
                            style={{
                                borderRadius: 2,
                                borderStyle: "dashed",
                                borderWidth: 1,
                                flex: 1,
                                marginRight: BLOCK_GAP,
                            }}
                        />
                    </View>
                )}

                <View
                    className="bg-muted"
                    style={{
                        bottom: -RULE_OVERHANG,
                        left: span(Math.min(slots.limit, slots.scale)),
                        marginLeft: -1,
                        position: "absolute",
                        top: -RULE_OVERHANG,
                        width: 1,
                    }}
                />
            </View>

            {sentence && !compact ? (
                <View className="flex-row items-baseline gap-1.5 pt-2">
                    <Text className="text-foreground text-footnote">{sentence}</Text>
                    <Text className="text-muted text-footnote">
                        {`${formatAmount(Math.abs(slots.remaining), currency, showCents, language)} ${
                            slots.remaining < 0 ? t("budgets.suffix.over") : t("budgets.suffix.left")
                        }`}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

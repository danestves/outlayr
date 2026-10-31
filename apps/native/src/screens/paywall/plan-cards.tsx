import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { Plan } from "@/domain/pro-plans";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";

import type { PlanListProps } from "./plan-list";

const UNIT = {
    annual: "pro.plan.perYearBare",
    lifetime: "pro.plan.once",
    monthly: "pro.plan.perMonthBare",
} as const;

function PlanCard({
    onSelect,
    plan,
    selected,
    stacked,
}: {
    onSelect: () => void;
    plan: Plan;
    selected: boolean;
    stacked: boolean;
}) {
    const t = useTranslation();
    const name = t(`pro.plan.${plan.kind}`);
    const save = plan.savingsPercent === null ? null : t("pro.plan.save", { percent: plan.savingsPercent });
    const trial = plan.trialDays === null ? null : t("pro.plan.trial", { days: plan.trialDays });
    const unit = t(UNIT[plan.kind]);

    return (
        <Pressable
            accessibilityLabel={[name, save, trial, plan.priceString, unit].filter(Boolean).join(", ")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={cn(
                "bg-surface justify-between gap-1.5 rounded-[14px] border-2 px-3 py-2.5",
                selected ? "border-foreground" : "border-transparent",
                !stacked && (plan.kind === "annual" ? "flex-[1.35]" : "flex-1")
            )}
            onPress={onSelect}
            testID={`paywall-plan-${plan.kind}`}
        >
            <View className="gap-0.5">
                <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
                    <Text className="text-foreground text-subtitle font-sans-semibold">{name}</Text>
                    {save === null ? null : <MonoLabel className="text-income">{save}</MonoLabel>}
                </View>
                {trial === null ? null : <MonoLabel className="text-foreground">{trial}</MonoLabel>}
            </View>
            <View>
                <Text
                    adjustsFontSizeToFit
                    className="text-foreground text-title font-sans-semibold tabular-nums"
                    minimumFontScale={0.6}
                    numberOfLines={1}
                >
                    {plan.priceString}
                </Text>
                <MonoLabel>{unit}</MonoLabel>
            </View>
        </Pressable>
    );
}

/** The yearly card is wider and starts selected; large text stacks the three so prices never truncate. */
export function PlanCards({ onSelect, plans, selected }: PlanListProps) {
    const stacked = useAccessibilityTextSize();
    return (
        <View accessibilityRole="radiogroup" className={cn("gap-2 pt-4", !stacked && "flex-row")}>
            {plans.map((plan) => (
                <PlanCard
                    key={plan.kind}
                    onSelect={() => onSelect(plan.kind)}
                    plan={plan}
                    selected={plan.kind === selected}
                    stacked={stacked}
                />
            ))}
        </View>
    );
}

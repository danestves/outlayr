import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { Plan } from "@/domain/pro-plans";
import { useTranslation } from "@/i18n/context";

import { noteOf } from "./plan-copy";
import type { PlanListProps } from "./plan-list";

const UNIT = {
    annual: "pro.plan.perYearBare",
    lifetime: "pro.plan.once",
    monthly: "pro.plan.perMonthBare",
} as const;

function PlanRow({ onSelect, plan, selected }: { onSelect: () => void; plan: Plan; selected: boolean }) {
    const t = useTranslation();
    const name = t(`pro.plan.${plan.kind}`);
    const note = noteOf(plan, t);
    const unit = t(UNIT[plan.kind]);

    return (
        <Pressable
            accessibilityLabel={[name, note, plan.priceString, unit].filter(Boolean).join(", ")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className="border-border min-h-14 flex-row items-center gap-3 border-t py-2.5"
            onPress={onSelect}
            testID={`paywall-plan-${plan.kind}`}
        >
            <View
                className={cn(
                    "size-[22px] items-center justify-center rounded-full border-2",
                    selected ? "border-foreground" : "border-muted"
                )}
            >
                {selected ? <View className="bg-foreground size-2.5 rounded-full" /> : null}
            </View>
            <View className="flex-1 gap-0.5">
                <Text className="text-foreground text-body font-sans-semibold">{name}</Text>
                {note === null ? null : <MonoLabel className="text-income">{note}</MonoLabel>}
            </View>
            <View className="flex-row items-baseline gap-1.5">
                <Text
                    adjustsFontSizeToFit
                    className={cn(
                        "text-foreground tabular-nums",
                        selected ? "font-sans-bold text-[28px] leading-[34px] tracking-tight" : "text-body"
                    )}
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

export function PlanRows({ onSelect, plans, selected }: PlanListProps) {
    return (
        <View accessibilityRole="radiogroup" className="pt-3">
            {plans.map((plan) => (
                <PlanRow
                    key={plan.kind}
                    onSelect={() => onSelect(plan.kind)}
                    plan={plan}
                    selected={plan.kind === selected}
                />
            ))}
        </View>
    );
}

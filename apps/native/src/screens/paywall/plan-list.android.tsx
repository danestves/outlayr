import { RadioButton } from "@expo/ui/jetpack-compose";
import { Pressable, View } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { Plan } from "@/domain/pro-plans";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { noteOf, unitOf } from "./plan-copy";
import type { PlanListProps } from "./plan-list";

export type { PlanListProps } from "./plan-list";

function PlanRow({ onSelect, plan, selected }: { onSelect: () => void; plan: Plan; selected: boolean }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const name = t(`pro.plan.${plan.kind}`);
    const note = noteOf(plan, t);
    const unit = unitOf(plan, t);
    const ink = selected ? "text-m3-on-secondary-container" : "text-m3-on-surface";
    const quiet = selected ? "text-m3-on-secondary-container" : "text-m3-on-surface-variant";

    return (
        <Pressable
            accessibilityLabel={[name, note, plan.priceString, unit].filter(Boolean).join(", ")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            android_ripple={{ color: withAlpha(m3.onSurface, 0.1) }}
            className={cn(
                "min-h-18 flex-row items-center gap-3 overflow-hidden rounded-2xl py-3 pr-4 pl-2",
                selected && "bg-m3-secondary-container"
            )}
            onPress={onSelect}
        >
            <View importantForAccessibility="no-hide-descendants">
                <MaterialHost matchContents>
                    <RadioButton selected={selected} />
                </MaterialHost>
            </View>
            <View className="flex-1 gap-0.5">
                <View className="flex-row flex-wrap items-center gap-2">
                    <Text className={cn("font-sans-medium text-body", ink)}>{name}</Text>
                    {plan.savingsPercent === null ? null : (
                        <View className="bg-m3-tertiary-container rounded-lg px-2 py-0.5">
                            <Text className="font-sans-medium text-label text-m3-on-tertiary-container">
                                {t("pro.plan.bestValue")}
                            </Text>
                        </View>
                    )}
                </View>
                {note === null ? null : <Text className={cn("text-caption", quiet)}>{note}</Text>}
            </View>
            <View className="items-end gap-0.5">
                <Text className={cn("text-body font-mono tabular-nums", ink)}>{plan.priceString}</Text>
                {unit === null ? null : <Text className={cn("text-micro font-mono uppercase", quiet)}>{unit}</Text>}
            </View>
        </Pressable>
    );
}

/**
 * An M3 single-choice list. The radios have no handler of their own: a tap on one reaches
 * its row too, and the row is what selects.
 */
export function PlanList({ onSelect, plans, selected }: PlanListProps) {
    return (
        <View accessibilityRole="radiogroup" className="gap-1 pt-3">
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

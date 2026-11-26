import { RadioGroup } from "panelui-native/components/radio-group";
import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { Plan, PlanKind } from "@/domain/pro-plans";
import { useTranslation } from "@/i18n/context";

import { noteOf, shownPrice, unitOf } from "./plan-copy";

export interface PlanListProps {
    onSelect: (kind: PlanKind) => void;
    plans: readonly Plan[];
    selected: PlanKind | null;
}

function PlanCard({ best, plan, selected }: { best: boolean; plan: Plan; selected: boolean }) {
    const t = useTranslation();
    const ink = selected ? "text-accent-foreground" : "text-foreground";
    const quiet = selected ? "text-accent-foreground/70" : "text-muted";
    const note = noteOf(plan, t);
    const unit = unitOf(plan, t);

    return (
        <View className="flex-row items-center gap-3">
            {best ? (
                <View className="bg-income absolute bottom-full left-0 mb-[7px] rounded-md px-2 py-0.5">
                    <MonoLabel className="text-background">{t("pro.plan.bestValue")}</MonoLabel>
                </View>
            ) : null}
            <View className="flex-1 gap-0.5">
                <Text className={cn("text-callout font-medium", ink)}>{t(`pro.plan.${plan.kind}`)}</Text>
                {note === null ? null : <Text className={cn("text-footnote", quiet)}>{note}</Text>}
            </View>
            <View
                className={cn(
                    "w-[118px] items-end gap-0.5 border-l pl-3",
                    selected ? "border-accent-foreground/25" : "border-border"
                )}
            >
                <Text className={cn("text-body font-mono tabular-nums", ink)}>{shownPrice(plan)}</Text>
                {unit === null ? null : <Text className={cn("text-micro font-mono uppercase", quiet)}>{unit}</Text>}
            </View>
        </View>
    );
}

/** The plans as ink cards, the selected one filled. `plan-list.android.tsx` is the M3 radio list. */
export function PlanList({ onSelect, plans, selected }: PlanListProps) {
    const hasBest = plans.some((plan) => plan.savingsPercent !== null);

    return (
        <RadioGroup
            className={hasBest ? "pt-6" : "pt-1.5"}
            onValueChange={(kind) => {
                const picked = plans.find((plan) => plan.kind === kind);
                if (picked !== undefined) {
                    onSelect(picked.kind);
                }
            }}
            value={selected ?? undefined}
            variant="card"
        >
            {plans.map((candidate) => (
                <RadioGroup.Item hideIndicator key={candidate.kind} value={candidate.kind}>
                    <PlanCard
                        best={candidate.savingsPercent !== null}
                        plan={candidate}
                        selected={candidate.kind === selected}
                    />
                </RadioGroup.Item>
            ))}
        </RadioGroup>
    );
}

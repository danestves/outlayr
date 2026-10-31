import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { TRIAL_REMINDER_LEAD_DAYS } from "@/domain/pro-status";
import { useTranslation } from "@/i18n/context";

/** Today, the reminder `trial-reminder.ts` arms, and the first charge. */
export function TrialTimeline({ trialDays }: { trialDays: number }) {
    const t = useTranslation();
    const remindDay = trialDays - TRIAL_REMINDER_LEAD_DAYS;
    const steps = [
        { day: t("common.today"), done: true, what: t("pro.timeline.unlocks") },
        ...(remindDay > 0
            ? [{ day: t("pro.timeline.day", { day: remindDay }), done: false, what: t("pro.timeline.remind") }]
            : []),
        { day: t("pro.timeline.day", { day: trialDays }), done: false, what: t("pro.timeline.charge") },
    ];
    return (
        <View
            accessibilityLabel={steps.map((step) => `${step.day}, ${step.what}`).join(". ")}
            accessible
            className="pt-4"
        >
            <View className="h-2 flex-row items-center justify-between">
                <View className="bg-border absolute inset-x-1 h-px" />
                {steps.map((step) => (
                    <View
                        className={cn("size-2 rounded-full", step.done ? "bg-income" : "bg-foreground")}
                        key={step.day}
                    />
                ))}
            </View>
            <View className="flex-row justify-between pt-1.5">
                {steps.map((step, index) => (
                    <View
                        className={cn(
                            "flex-1",
                            index === 0 && "items-start",
                            index > 0 && index < steps.length - 1 && "items-center",
                            index === steps.length - 1 && "items-end"
                        )}
                        key={step.day}
                    >
                        <MonoLabel>{step.day}</MonoLabel>
                        <Text className="text-foreground text-footnote">{step.what}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { TRIAL_REMINDER_LEAD_DAYS } from "@/domain/pro-status";
import { useTranslation } from "@/i18n/context";

interface Step {
    body: string;
    label: string;
}

/** What happens between starting the trial and the first charge, so the trial reads as safe to start. */
export function TrialTimeline({ price, trialDays }: { price: string; trialDays: number }) {
    const t = useTranslation();
    const reminderDay = trialDays - TRIAL_REMINDER_LEAD_DAYS;
    const steps: Step[] = [
        { body: t("pro.timeline.today"), label: t("pro.timeline.todayLabel") },
        ...(reminderDay > 0
            ? [{ body: t("pro.timeline.reminder"), label: t("pro.timeline.day", { day: reminderDay }) }]
            : []),
        { body: t("pro.timeline.charge", { price }), label: t("pro.timeline.day", { day: trialDays }) },
    ];
    return (
        <View accessibilityRole="list" className="pt-6">
            {steps.map((step, index) => {
                const last = index === steps.length - 1;
                return (
                    <View className="flex-row gap-4" key={step.label}>
                        <View className="w-3 items-center">
                            <View
                                className={cn(
                                    "mt-1 size-3 rounded-full border-2",
                                    index === 0 ? "border-tint bg-tint" : "border-border bg-background"
                                )}
                            />
                            {last ? null : <View className="bg-border w-0.5 flex-1" />}
                        </View>
                        <View className={cn("flex-1 gap-0.5", last ? "pb-1" : "pb-5")}>
                            <MonoLabel>{step.label}</MonoLabel>
                            <Text className="text-foreground text-body leading-snug">{step.body}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

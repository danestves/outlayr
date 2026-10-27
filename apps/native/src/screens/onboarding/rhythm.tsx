import * as Cause from "effect/Cause";
import { View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { OutlayrMark } from "@/components/outlayr-mark";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { formatTimeOfDay, REMINDER_EVENING, reminderTime } from "@/domain/reminder";
import { useTranslation } from "@/i18n/context";
import { SILENT } from "@/state/atom-command";
import { finishOnboardingCommand } from "@/state/lifecycle-commands";
import { chooseFirstRunReminderCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

const EVENING = reminderTime(REMINDER_EVENING, { hour: 20, minute: 0 });

/** Content only: the OS prompt waits for the first saved entry, since iOS never asks twice. */
function MockNotification({ body, back }: { body: string; back?: boolean }) {
    return (
        <View
            className={cn(
                "border-fr-rule bg-fr-card w-64 flex-row items-start gap-2.5 rounded-2xl border px-3.5 py-3",
                back && "-mb-10 scale-90 -rotate-1 opacity-55"
            )}
        >
            <OutlayrMark size={26} />
            <View className="flex-1 gap-0.5">
                <Text className="font-sans-semibold text-footnote text-fr-ink">Outlayr</Text>
                <Text className="text-footnote text-fr-muted">{body}</Text>
            </View>
        </View>
    );
}

export function OnboardingRhythm() {
    const db = useDatabase();
    const t = useTranslation();
    const finishOnboarding = useAtomAction(
        finishOnboardingCommand,
        { onFailure: (cause) => console.error("Finishing onboarding failed", Cause.squash(cause)) },
        SILENT
    );
    const chooseReminder = useAtomAction(
        chooseFirstRunReminderCommand,
        {
            onFailure: (cause) => console.error("Saving the first-run reminder choice failed", Cause.squash(cause)),
            onSettled: () => finishOnboarding(db),
        },
        SILENT
    );

    // `finishOnboarding` settles the root guard, which swaps this stack. Nothing navigates.
    const finish = () => finishOnboarding(db);

    const remind = () => chooseReminder({ db, option: REMINDER_EVENING });

    return (
        <FirstRun
            action={{
                label: t("onboarding.rhythm.remind", {
                    time: formatTimeOfDay(EVENING),
                }),
                onPress: remind,
            }}
            body={t("onboarding.rhythm.body")}
            eyebrow={t("onboarding.rhythm.eyebrow")}
            object={
                <View className="items-center">
                    <MockNotification back body={t("onboarding.rhythm.notifYesterday")} />
                    <MockNotification body={t("onboarding.rhythm.notifToday")} />
                </View>
            }
            skip={{ label: t("onboarding.rhythm.none"), onPress: finish }}
            title={t("onboarding.rhythm.title")}
        />
    );
}

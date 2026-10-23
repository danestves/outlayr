import { useRouter } from "expo-router";
import { isAvailableAsync } from "expo-store-review";
import { View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { OutlayrMark } from "@/components/outlayr-mark";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { finishOnboarding, markReminderChosen } from "@/data/onboarding-core";
import { setNumberSetting } from "@/data/settings-core";
import { formatTimeOfDay, REMINDER_EVENING, reminderTime } from "@/domain/reminder";
import { useTranslation } from "@/i18n/context";

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
    const router = useRouter();
    const t = useTranslation();

    const finish = () => {
        isAvailableAsync()
            .catch(() => false)
            .then(async (rateable) => {
                if (rateable) {
                    router.push("/onboarding/rating");
                    return;
                }
                await finishOnboarding(db);
            })
            .catch((cause: unknown) => {
                console.error("Finishing onboarding failed", cause);
            });
    };

    const remind = () => {
        Promise.all([setNumberSetting(db, "notificationOption", REMINDER_EVENING), markReminderChosen(db)])
            .then(finish)
            .catch((cause: unknown) => {
                console.error("Saving the first-run reminder choice failed", cause);
                finish();
            });
    };

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

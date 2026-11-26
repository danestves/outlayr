import * as Cause from "effect/Cause";
import { useFocusEffect, useRouter } from "expo-router";
import { useRef } from "react";
import { ScrollView, View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { LinkRow } from "@/components/list/list-row";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { useDatabase } from "@/contexts/local-data-context";
import type { MoneyGoal } from "@/domain/money-goal";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { SILENT } from "@/state/atom-command";
import { setMoneyGoalCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { STEP_PROGRESS } from "./progress";

const GOALS = [
    { icon: "ChartBarIncreasing", label: "onboarding.goal.option.track", value: "track" },
    { icon: "Wallet01", label: "onboarding.goal.option.spendLess", value: "spendLess" },
    { icon: "Coins01", label: "onboarding.goal.option.save", value: "save" },
    { icon: "CreditCard", label: "onboarding.goal.option.payDebt", value: "payDebt" },
] as const satisfies readonly { icon: SettingsIconName; label: TranslationKey; value: MoneyGoal }[];

export function OnboardingGoal() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const choosing = useRef(false);
    useFocusEffect(() => {
        choosing.current = false;
    });
    const chooseGoal = useAtomAction(
        setMoneyGoalCommand,
        {
            onFailure: (cause) => {
                console.error("Saving the onboarding goal failed", Cause.squash(cause));
                choosing.current = false;
            },
            onSuccess: () => router.push("/onboarding/currency"),
        },
        SILENT
    );

    const pick = (goal: MoneyGoal) => {
        if (choosing.current) {
            return;
        }
        choosing.current = true;
        chooseGoal({ db, goal, source: "onboarding" });
    };

    return (
        <FirstRun body={t("onboarding.goal.body")} progress={STEP_PROGRESS.goal} title={t("onboarding.goal.title")}>
            <ScrollView className="shrink grow-0">
                <View className="border-border border-t">
                    {GOALS.map((goal) => (
                        <LinkRow
                            icon={goal.icon}
                            key={goal.value}
                            onPress={() => pick(goal.value)}
                            title={t(goal.label)}
                        />
                    ))}
                </View>
            </ScrollView>
        </FirstRun>
    );
}

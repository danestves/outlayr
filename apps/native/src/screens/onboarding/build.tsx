import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { isPerson } from "@outlayr/money/account-kind";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

import { FirstRun } from "@/components/first-run";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { useGlobalCurrency, useMeta } from "@/data/app-meta";
import { formatAmount } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useOnMount, useTimers } from "@/lib/lifecycle";

import { STEP_PROGRESS } from "./progress";

const BUILD_DELAY_MS = 1500;

function CheckRow({ children }: { children: ReactNode }) {
    // SAFETY: declared in global.css for both schemes, so it always resolves.
    const [vermilion] = useCSSVariable(["--color-fr-vermilion"]) as [string];
    return (
        <View className="flex-row items-center gap-3">
            <HugeiconsIcon color={vermilion} icon={Tick02Icon} size={18} strokeWidth={2.4} />
            <Text className="text-body text-fr-ink">{children}</Text>
        </View>
    );
}

export function OnboardingBuild() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const timers = useTimers();
    const currency = useGlobalCurrency(db);
    const amount = numpadToNumber(useLocalSearchParams<{ amount?: string }>().amount ?? "");
    const accountCount = useAccounts(db).filter((account) => !isPerson(account)).length;
    const goal = useMeta(db, "moneyGoal");

    useOnMount(() =>
        timers.after(BUILD_DELAY_MS, () =>
            router.replace({ params: { amount: String(amount) }, pathname: "/onboarding/reveal" })
        )
    );

    return (
        <FirstRun progress={STEP_PROGRESS.build} title={t("onboarding.build.title")}>
            <View className="gap-4">
                <CheckRow>{t("onboarding.build.totals", { currency })}</CheckRow>
                <CheckRow>{t("onboarding.accounts.accounts", { count: accountCount })}</CheckRow>
                {goal === null ? null : (
                    <CheckRow>{t("onboarding.build.goal", { goal: t(`onboarding.goal.option.${goal}`) })}</CheckRow>
                )}
                <CheckRow>
                    {t("onboarding.build.amount", { amount: formatAmount(amount, currency, false, language) })}
                </CheckRow>
            </View>
        </FirstRun>
    );
}

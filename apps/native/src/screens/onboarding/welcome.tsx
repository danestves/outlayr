import { useRouter } from "expo-router";

import { FirstRun } from "@/components/first-run";
import { OutlayrMark } from "@/components/outlayr-mark";
import { useNow } from "@/data/use-now";
import { flyleafDate } from "@/domain/flyleaf";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useWhen } from "@/lib/lifecycle";
import { useMoneyManagerSession } from "@/lib/money-manager-session";

export function OnboardingWelcome() {
    const nowMs = useNow();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { pending } = useMoneyManagerSession();

    // A backup opened in Outlayr before the first run lands here, since the guard keeps the ledger's routes shut.
    useWhen(pending !== null, () => {
        router.push("/onboarding/import/money-manager/open");
    });

    return (
        <FirstRun
            action={{
                label: t("common.continue"),
                onPress: () => router.push("/onboarding/goal"),
            }}
            body={t("onboarding.cover.line")}
            cover
            eyebrow={t("onboarding.welcome.begun", {
                date: flyleafDate(new Date(nowMs), language),
            })}
            note={t("onboarding.cover.noSignUp")}
            object={<OutlayrMark size={92} />}
            skip={{ label: t("mmImport.welcome.switching"), onPress: () => router.push("/onboarding/import") }}
            title={t("onboarding.welcome.title")}
        />
    );
}

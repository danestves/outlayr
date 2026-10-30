import { useRouter } from "expo-router";
import { useEffect } from "react";

import { FirstRun } from "@/components/first-run";
import { OutlayrMark } from "@/components/outlayr-mark";
import { flyleafDate } from "@/domain/flyleaf";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useMoneyManagerSession } from "@/lib/money-manager-session";

export function OnboardingWelcome() {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { pending } = useMoneyManagerSession();

    // A backup opened in Outlayr before the first run lands here, since the guard keeps the ledger's routes shut.
    // oxlint-disable-next-line outlayr/react-effect-budget -- routes a handed-over backup into the onboarding import
    useEffect(() => {
        if (pending !== null) {
            router.push("/onboarding/import/money-manager/open");
        }
    }, [pending, router]);

    return (
        <FirstRun
            action={{
                label: t("common.continue"),
                onPress: () => router.push("/onboarding/currency"),
            }}
            body={t("onboarding.cover.line")}
            cover
            eyebrow={t("onboarding.welcome.begun", {
                date: flyleafDate(new Date(), language),
            })}
            object={<OutlayrMark size={92} />}
            skip={{ label: t("mmImport.welcome.switching"), onPress: () => router.push("/onboarding/import") }}
            title={t("onboarding.welcome.title")}
        />
    );
}

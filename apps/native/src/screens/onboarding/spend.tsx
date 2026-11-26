import { useRouter } from "expo-router";
import { useState } from "react";

import { AmountNumpad } from "@/components/amount-numpad";
import { FirstRun } from "@/components/first-run";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { minorUnitsFor } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { trackOnboarding } from "@/lib/onboarding-events";

import { useFinishOnboarding } from "./finish";
import { STEP_PROGRESS } from "./progress";

export function OnboardingSpend() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const currency = useGlobalCurrency(db);
    const [value, setValue] = useState("");
    const { clearFailed, failed, finish } = useFinishOnboarding();
    const amount = numpadToNumber(value);

    const skip = () => {
        clearFailed();
        trackOnboarding("onboarding_budget", { outcome: "skipped" });
        finish();
    };

    return (
        <FirstRun
            action={{
                disabled: amount <= 0,
                label: t("common.continue"),
                onPress: () => router.push({ params: { amount: String(amount) }, pathname: "/onboarding/build" }),
            }}
            body={t("onboarding.spend.body")}
            error={failed}
            progress={STEP_PROGRESS.spend}
            skip={{ label: t("onboarding.spend.skip"), onPress: skip }}
            title={t("onboarding.spend.title")}
        >
            <AmountNumpad code={currency} minorUnits={minorUnitsFor(currency)} onChange={setValue} value={value} />
        </FirstRun>
    );
}

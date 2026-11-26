import * as Cause from "effect/Cause";
import { useFocusEffect, useRouter } from "expo-router";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { finishFirstRunCommand } from "@/state/lifecycle-commands";
import { finishOnboardingOfferCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useOnboardingOfferDue } from "./pro";

export function useFinishOnboarding() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const offerDue = useOnboardingOfferDue();
    const isPro = useRevenueCat().kind === "pro";
    const [failed, setFailed] = useState(false);
    const finishing = useRef(false);
    useFocusEffect(() => {
        finishing.current = false;
    });
    const onFailure = (cause: Cause.Cause<unknown>) => {
        console.error("Finishing onboarding failed", Cause.squash(cause));
        finishing.current = false;
        haptics("error");
        setFailed(true);
    };
    const finishFirstRun = useAtomAction(finishFirstRunCommand, { onFailure }, SILENT);
    const finishAsPro = useAtomAction(finishOnboardingOfferCommand, { onFailure }, SILENT);

    const finish = () => {
        if (finishing.current) {
            return;
        }
        finishing.current = true;
        if (isPro) {
            finishAsPro({ db, purchased: true });
        } else if (offerDue) {
            router.push("/onboarding/pro");
        } else {
            finishFirstRun(db);
        }
    };

    return {
        clearFailed: () => setFailed(false),
        failed: failed ? t("onboarding.firstEntry.finishFailed") : null,
        finish,
    };
}

import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { finishFirstRunCommand } from "@/state/lifecycle-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useOnboardingOfferDue } from "./pro";

export function useFinishOnboarding() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const offerDue = useOnboardingOfferDue();
    const [failed, setFailed] = useState(false);
    const finishFirstRun = useAtomAction(
        finishFirstRunCommand,
        {
            onFailure: (cause) => {
                console.error("Finishing onboarding failed", Cause.squash(cause));
                haptics("error");
                setFailed(true);
            },
        },
        SILENT
    );

    const finish = () => {
        if (offerDue) {
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

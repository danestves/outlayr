import * as Cause from "effect/Cause";
import { useFocusEffect } from "expo-router";
import { useRef } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { notifyFailure } from "@/lib/notify";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { PaywallRedesign } from "@/screens/paywall/redesign";
import { saleReach } from "@/screens/paywall/use-paywall-flow";
import type { LeaveOutcome } from "@/screens/paywall/use-paywall-flow";
import { SILENT } from "@/state/atom-command";
import { finishOnboardingOfferCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

/** The offer closes onboarding only for someone this build can sell to who is not Pro yet. */
export function useOnboardingOfferDue(): boolean {
    const free = useRevenueCat().kind === "free";
    const { needsAccount, noCloud } = saleReach(useAuthSession().accountId);
    return free && !needsAccount && !noCloud;
}

export function OnboardingPro() {
    const db = useDatabase();
    const haptics = useHaptics();
    const t = useTranslation();
    const isPro = useRevenueCat().kind === "pro";
    // Continue and the purchase callback can both land; a second run would create the waiting accounts twice.
    const finishing = useRef(false);
    const finish = useAtomAction(
        finishOnboardingOfferCommand,
        {
            onFailure: (cause) => {
                console.error("Finishing onboarding failed", Cause.squash(cause));
                haptics("error");
                notifyFailure({ title: t("onboarding.offer.failed") });
                finishing.current = false;
            },
        },
        SILENT
    );
    const leave = (outcome: LeaveOutcome) => {
        if (!finishing.current) {
            finishing.current = true;
            finish({ db, purchased: outcome === "pro" || isPro });
        }
    };
    useFocusEffect(() => {
        posthog?.capture("paywall_viewed", { trigger: "onboarding", variant: "redesign" });
    });
    return <PaywallRedesign onLeave={leave} trigger="onboarding" />;
}

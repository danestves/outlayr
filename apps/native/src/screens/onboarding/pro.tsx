import * as Cause from "effect/Cause";
import { useFocusEffect } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useAuthSession } from "@/lib/auth-session";
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
    const isPro = useRevenueCat().kind === "pro";
    const finish = useAtomAction(
        finishOnboardingOfferCommand,
        {
            onFailure: (cause) => {
                console.error("Finishing onboarding failed", Cause.squash(cause));
                haptics("error");
            },
        },
        SILENT
    );
    useFocusEffect(() => {
        posthog?.capture("paywall_viewed", { trigger: "onboarding", variant: "redesign" });
    });
    return (
        <PaywallRedesign
            onLeave={(outcome: LeaveOutcome) => finish({ db, purchased: outcome === "pro" || isPro })}
            trigger="onboarding"
        />
    );
}

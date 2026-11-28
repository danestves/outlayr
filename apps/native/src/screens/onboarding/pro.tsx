import * as Cause from "effect/Cause";
import { useFocusEffect, useRouter } from "expo-router";
import { useRef } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { proSellable } from "@/hooks/use-pro-locked";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { PaywallRedesign } from "@/screens/paywall/redesign";
import type { LeaveOutcome } from "@/screens/paywall/use-paywall-flow";
import { SILENT } from "@/state/atom-command";
import { claimOnboardingAccountsCommand, finishOnboardingOfferCommand } from "@/state/onboarding-commands";
import { markPaywallSeenCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useOnboardingBankDue } from "./bank";

/** The offer closes onboarding only for someone this build can sell to who is not Pro yet. */
export function useOnboardingOfferDue(): boolean {
    return useRevenueCat().kind === "free" && proSellable();
}

export function OnboardingPro() {
    const db = useDatabase();
    const haptics = useHaptics();
    const t = useTranslation();
    const isPro = useRevenueCat().kind === "pro";
    const markSeen = useAtomAction(markPaywallSeenCommand, {}, SILENT);
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
    const router = useRouter();
    const bankDue = useOnboardingBankDue();
    const toBank = useAtomAction(
        claimOnboardingAccountsCommand,
        { onSettled: () => router.replace("/onboarding/bank") },
        SILENT
    );
    const leave = (outcome: LeaveOutcome) => {
        if (finishing.current) {
            return;
        }
        finishing.current = true;
        // Linking right after the trial starts gives the bank the whole trial to log charges before it ends.
        if (outcome === "pro" && bankDue) {
            toBank(db);
            return;
        }
        finish({ db, purchased: outcome === "pro" || isPro });
    };
    useFocusEffect(() => {
        posthog?.capture("paywall_viewed", { trigger: "onboarding", variant: "redesign" });
        markSeen(db);
    });
    return <PaywallRedesign onLeave={leave} trigger="onboarding" />;
}

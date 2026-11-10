import { usePathname, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

import { useRevenueCat } from "@/contexts/revenuecat-context";
import { paywallHref } from "@/domain/paywall-trigger";
import { purchaseResume } from "@/domain/purchase-resume";
import { useAuthSession } from "@/lib/auth-session";
import { posthog } from "@/lib/posthog";
import { purchaseIntent, usePurchaseIntent } from "@/lib/purchase-intent";

export function usePaywallOpeners(ready: boolean): void {
    const router = useRouter();
    const pathname = usePathname();
    const segments: readonly string[] = useSegments();
    const onTabs = ready && segments[0] === "(tabs)";
    const { accountId } = useAuthSession();
    const entitlement = useRevenueCat();
    const intent = usePurchaseIntent();
    const resume = purchaseResume({ accountId, entitlement, intent, onTabs, pathname });

    // oxlint-disable-next-line outlayr/react-effect-budget -- signing in swaps the root stack under the paywall
    useEffect(() => {
        const taken = purchaseIntent.get();
        if (resume === null || taken === null) {
            return;
        }
        if (resume === "drop") {
            purchaseIntent.clear();
            if (accountId === null) {
                posthog?.capture("paywall_dismissed", {
                    sale_state: "needs_account",
                    trigger: taken.trigger,
                    variant: taken.variant,
                });
            }
            return;
        }
        purchaseIntent.hand();
        router.push(paywallHref(taken.trigger));
    }, [accountId, resume, router]);
}

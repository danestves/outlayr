import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { paywallTriggerOf } from "@/domain/paywall-trigger";
import { paywallVariant, posthog } from "@/lib/posthog";
import { Paywall } from "@/screens/paywall";
import { PaywallRedesign } from "@/screens/paywall/redesign";

export default function PaywallScreen() {
    const { trigger: triggerParam, variant: override } = useLocalSearchParams<{ trigger?: string; variant?: string }>();
    // Read once: a flag that lands mid-visit must not swap the screen under the user.
    const [variant] = useState(() => paywallVariant(override));
    const trigger = paywallTriggerOf(triggerParam);
    useFocusEffect(() => {
        posthog?.capture("paywall_viewed", { trigger, variant });
    });
    return (
        <>
            <CloseToolbar placement="right" />
            {variant === "redesign" ? <PaywallRedesign /> : <Paywall />}
        </>
    );
}

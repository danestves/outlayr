import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { paywallVariant } from "@/lib/posthog";
import { Paywall } from "@/screens/paywall";
import { PaywallRedesign } from "@/screens/paywall/redesign";

export default function PaywallScreen() {
    const { variant: override } = useLocalSearchParams<{ variant?: string }>();
    // Read once: a flag that lands mid-visit must not swap the screen under the user.
    const [variant] = useState(() => paywallVariant(override));
    return (
        <>
            <CloseToolbar placement="right" />
            {variant === "redesign" ? <PaywallRedesign /> : <Paywall />}
        </>
    );
}

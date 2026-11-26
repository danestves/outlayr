import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { useDatabase } from "@/contexts/local-data-context";
import { paywallTriggerOf } from "@/domain/paywall-trigger";
import { paywallVariant, posthog } from "@/lib/posthog";
import { Paywall } from "@/screens/paywall";
import { PaywallRedesign } from "@/screens/paywall/redesign";
import { SILENT } from "@/state/atom-command";
import { markPaywallSeenCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

export default function PaywallScreen() {
    const db = useDatabase();
    const { trigger: triggerParam, variant: override } = useLocalSearchParams<{ trigger?: string; variant?: string }>();
    // Read once: a flag that lands mid-visit must not swap the screen under the user.
    const [variant] = useState(() => paywallVariant(override));
    const trigger = paywallTriggerOf(triggerParam);
    const markSeen = useAtomAction(markPaywallSeenCommand, {}, SILENT);
    useFocusEffect(() => {
        posthog?.capture("paywall_viewed", { trigger, variant });
        markSeen(db);
    });
    return (
        <>
            <CloseToolbar placement="right" />
            {variant === "redesign" ? <PaywallRedesign /> : <Paywall />}
        </>
    );
}

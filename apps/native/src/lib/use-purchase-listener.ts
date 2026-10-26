import { useState } from "react";

import { useAppActive } from "@/lib/app-state";
import { purchaseListener } from "@/lib/purchase-listener";
import type { PurchaseSender } from "@/lib/purchase-listener";

export interface ListenerState {
    allowed: ReadonlySet<string>;
    enabled: boolean;
    senders: PurchaseSender[];
}

function readListener(): ListenerState {
    return {
        allowed: new Set(purchaseListener?.apps()),
        enabled: purchaseListener?.isEnabled() ?? false,
        senders: purchaseListener?.senders() ?? [],
    };
}

export function usePurchaseListener(): [ListenerState, () => void] {
    const [listener, setListener] = useState(readListener);
    const active = useAppActive();
    const [wasActive, setWasActive] = useState(active);

    if (active !== wasActive) {
        setWasActive(active);
        if (active) {
            setListener(readListener());
        }
    }

    return [listener, () => setListener(readListener())];
}

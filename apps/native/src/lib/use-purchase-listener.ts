import { useEffect, useState } from "react";
import { AppState } from "react-native";

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

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                setListener(readListener());
            }
        });
        return () => subscription.remove();
    }, []);

    return [listener, () => setListener(readListener())];
}

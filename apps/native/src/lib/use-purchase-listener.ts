import { useSyncExternalStore } from "react";

import { subscribeAppState } from "@/lib/app-state";
import { purchaseListener } from "@/lib/purchase-listener";
import type { PurchaseSender } from "@/lib/purchase-listener";

export interface ListenerState {
    allowed: ReadonlySet<string>;
    enabled: boolean;
    messagesApp: string | null;
    senders: PurchaseSender[];
}

function readListener(): ListenerState {
    return {
        allowed: new Set(purchaseListener?.apps()),
        enabled: purchaseListener?.isEnabled() ?? false,
        messagesApp: purchaseListener?.messagesApp() ?? null,
        senders: purchaseListener?.senders() ?? [],
    };
}

let current = readListener();
const watchers = new Set<() => void>();

function refresh() {
    current = readListener();
    for (const notify of watchers) {
        notify();
    }
}

function subscribe(notify: () => void): () => void {
    if (watchers.size === 0) {
        current = readListener();
    }
    watchers.add(notify);
    const stop = subscribeAppState((status) => {
        if (status === "active") {
            refresh();
        }
    });
    return () => {
        watchers.delete(notify);
        stop();
    };
}

const snapshot = () => current;

export function usePurchaseListener(): [ListenerState, () => void] {
    return [useSyncExternalStore(subscribe, snapshot), refresh];
}

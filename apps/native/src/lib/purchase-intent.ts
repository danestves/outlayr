import { useSyncExternalStore } from "react";

import type { PaywallTrigger } from "@/domain/paywall-trigger";
import type { PlanKind } from "@/domain/pro-plans";

export interface PurchaseIntent {
    kind: PlanKind;
    trigger: typeof PaywallTrigger.Type;
}

let intent: PurchaseIntent | null = null;
const listeners = new Set<() => void>();

function set(next: PurchaseIntent | null) {
    intent = next;
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export const purchaseIntent = {
    clear: () => set(null),
    get: () => intent,
    set,
};

export function usePurchaseIntent(): PurchaseIntent | null {
    return useSyncExternalStore(subscribe, purchaseIntent.get);
}

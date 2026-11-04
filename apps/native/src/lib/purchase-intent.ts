import { useSyncExternalStore } from "react";

import type { PaywallTrigger } from "@/domain/paywall-trigger";
import type { PlanKind } from "@/domain/pro-plans";
import type { PaywallVariant } from "@/lib/posthog";

export interface PurchaseIntent {
    handed: boolean;
    kind: PlanKind;
    trigger: typeof PaywallTrigger.Type;
    variant: typeof PaywallVariant.Type;
}

let intent: PurchaseIntent | null = null;
const listeners = new Set<() => void>();

function write(next: PurchaseIntent | null) {
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
    clear: () => write(null),
    get: () => intent,
    hand: () => write(intent && { ...intent, handed: true }),
    set: (next: Omit<PurchaseIntent, "handed">) => write({ ...next, handed: false }),
};

export function usePurchaseIntent(): PurchaseIntent | null {
    return useSyncExternalStore(subscribe, purchaseIntent.get);
}

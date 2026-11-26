import { useSyncExternalStore } from "react";

import { subscribeAppState } from "@/lib/app-state";
import { trackAutologSetup } from "@/lib/autolog-events";
import type { AutologSurface } from "@/lib/autolog-events";
import { purchaseListener } from "@/lib/purchase-listener";
import type { PurchaseSender } from "@/lib/purchase-listener";

export interface ListenerState {
    allowed: ReadonlySet<string>;
    enabled: boolean;
    messagesApp: string | null;
    senders: PurchaseSender[];
}

interface ListenerAccessRequest {
    surface: AutologSurface;
    trigger: "notification_access" | "bank_texts";
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
let stopAwaiting: (() => void) | null = null;

export function settleAccess(request: ListenerAccessRequest): void {
    const state = readListener();
    const granted =
        request.trigger === "notification_access"
            ? state.enabled
            : state.enabled && state.messagesApp !== null && state.allowed.has(state.messagesApp);
    trackAutologSetup({ ...request, outcome: granted ? "granted" : "denied" });
}

export function openListenerAccess(request: ListenerAccessRequest): void {
    trackAutologSetup({ ...request, outcome: "started" });
    stopAwaiting?.();
    const stop = subscribeAppState((status) => {
        if (status === "active") {
            stop();
            stopAwaiting = null;
            settleAccess(request);
        }
    });
    stopAwaiting = stop;
    purchaseListener?.openSettings();
}

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

import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { useSyncExternalStore } from "react";

const KEY = `outlayr.aiConsent.v${AI_CONSENT_VERSION}`;
const PLAN_SCAN_KEY = "outlayr.aiConsentPlanScan";
const listeners = new Set<() => void>();

export function hasAiConsent(): boolean {
    try {
        return globalThis.localStorage?.getItem(KEY) === "granted";
    } catch {
        return false;
    }
}

export function hasPlanScanConsent(): boolean {
    try {
        return globalThis.localStorage?.getItem(PLAN_SCAN_KEY) === String(AI_CONSENT_VERSION);
    } catch {
        return false;
    }
}

function subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => {
        if (event.key === KEY || event.key === PLAN_SCAN_KEY || event.key === null) {
            listener();
        }
    };
    listeners.add(listener);
    globalThis.addEventListener("storage", onStorage);
    return () => {
        listeners.delete(listener);
        globalThis.removeEventListener("storage", onStorage);
    };
}

function store(key: string, value: string | null) {
    try {
        if (value === null) {
            globalThis.localStorage?.removeItem(key);
        } else {
            globalThis.localStorage?.setItem(key, value);
        }
    } catch {
        // Blocked storage leaves consent off, which is the safe answer.
    }
}

function changed() {
    for (const listener of listeners) {
        listener();
    }
}

/** Consent is per device, like the phone's, and its switch answers for every AI feature, screenshots included. */
export function chooseAiConsent(granted: boolean) {
    store(KEY, granted ? "granted" : null);
    store(PLAN_SCAN_KEY, granted ? String(AI_CONSENT_VERSION) : null);
    changed();
}

/** An installment screenshot asks on its own, even with the rest allowed, as the privacy policy promises. */
export function allowPlanScan() {
    store(PLAN_SCAN_KEY, String(AI_CONSENT_VERSION));
    changed();
}

export const useAiConsent = () => useSyncExternalStore(subscribe, hasAiConsent, () => false);

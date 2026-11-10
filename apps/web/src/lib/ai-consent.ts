import { AI_CONSENT_VERSION } from "@outlayr/money/contract";

const KEY = "outlayr.aiConsentPlanScan";
const listeners = new Set<() => void>();

export function readAiConsent() {
    try {
        return localStorage.getItem(KEY) === String(AI_CONSENT_VERSION);
    } catch {
        return false;
    }
}

export function subscribeAiConsent(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function chooseAiConsent(allowed: boolean) {
    try {
        if (allowed) {
            localStorage.setItem(KEY, String(AI_CONSENT_VERSION));
        } else {
            localStorage.removeItem(KEY);
        }
    } catch {
        return;
    }
    for (const listener of listeners) {
        listener();
    }
}

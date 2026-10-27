import type { TranslationKey } from "@/i18n/catalog";
import type { PurchaseOutcome } from "@/lib/revenuecat-service";

interface PaywallNext {
    failure: TranslationKey | null;
    leave: boolean;
}

export function purchaseNext(outcome: typeof PurchaseOutcome.Type, mirrored: boolean): PaywallNext {
    if (!mirrored) {
        return { failure: "pro.syncPendingBody", leave: false };
    }
    if (outcome === "pro") {
        return { failure: null, leave: true };
    }
    return { failure: outcome === "unentitled" ? "pro.unentitledBody" : null, leave: false };
}

export function restoreNext(restored: boolean, mirrored: boolean): PaywallNext {
    if (!mirrored) {
        return { failure: "pro.restorePendingBody", leave: false };
    }
    return restored ? { failure: null, leave: true } : { failure: "pro.nothingRestoredBody", leave: false };
}

import { useRevenueCat } from "@/contexts/revenuecat-context";
import { convex } from "@/lib/convex";

// Most of Pro runs on the account service, so a build without one has no checkout and must gate nothing.
export function proSellable(): boolean {
    return convex !== null;
}

// A leaf on purpose: the local database reads Pro state at mount, so needing `useDatabase` here would close a cycle.
export function useProLocked(): boolean {
    const { isConfigured, isPro, isResolved } = useRevenueCat();
    // Unresolved locks nothing: `isPro` starts false, so gating on it would paywall a paying customer at every cold
    // launch. Nor does an unsellable build, whose customer would have no way forward.
    return proSellable() && isConfigured && isResolved && !isPro;
}

// Not the inverse of `useProLocked`. Server-gated capabilities read this, and it takes the account mirror because
// `requirePro` does: an entitlement the server has not been told about only buys refused requests.
export function useProEntitled(): boolean {
    const { isConfigured, isMirrored, isPro } = useRevenueCat();
    return isConfigured && isPro && isMirrored;
}

export function useProPending(): boolean {
    const { isConfigured, isPending } = useRevenueCat();
    return isConfigured && isPending;
}

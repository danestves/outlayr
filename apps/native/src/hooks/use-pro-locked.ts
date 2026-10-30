import { useRevenueCat } from "@/contexts/revenuecat-context";
import { convex } from "@/lib/convex";

// Most of Pro runs on the account service, so a build without one has no checkout and must gate nothing.
export function proSellable(): boolean {
    return convex !== null;
}

// A leaf on purpose: the local database reads Pro state at mount, so needing `useDatabase` here would close a cycle.
export function useProLocked(): boolean {
    const { kind } = useRevenueCat();
    // Unresolved locks nothing: Pro reads false until the sign-in answers, so gating on it would paywall a paying
    // customer at every cold launch. Nor does an unsellable build, whose customer would have no way forward.
    return proSellable() && kind === "free";
}

// Not the inverse of `useProLocked`. Server-gated capabilities read this, and it takes the account mirror because
// `requirePro` does: an entitlement the server has not been told about only buys refused requests.
export function useProEntitled(): boolean {
    const entitlement = useRevenueCat();
    return entitlement.kind === "pro" && entitlement.mirrored;
}

export function useProPending(): boolean {
    const entitlement = useRevenueCat();
    return entitlement.kind !== "unconfigured" && entitlement.pending;
}

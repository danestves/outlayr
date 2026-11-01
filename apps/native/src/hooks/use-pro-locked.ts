import { useRevenueCat } from "@/contexts/revenuecat-context";
import { convex } from "@/lib/convex";
import type { Entitlement } from "@/lib/revenuecat-service";

// Most of Pro runs on the account service, so a build without one has no checkout and must gate nothing.
export function proSellable(): boolean {
    return convex !== null;
}

// A leaf on purpose: the local database reads Pro state at mount, so needing `useDatabase` here would close a cycle.
export function useProLocked(): boolean {
    const { kind } = useRevenueCat();
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

export function proConfirmed(kind: Entitlement["kind"], sellable: boolean): boolean {
    return !sellable || kind === "pro" || kind === "unconfigured";
}

export function useProConfirmed(): boolean {
    const { kind } = useRevenueCat();
    return proConfirmed(kind, proSellable());
}

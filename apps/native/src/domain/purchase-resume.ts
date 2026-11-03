import type { PurchaseIntent } from "@/lib/purchase-intent";
import type { Entitlement } from "@/lib/revenuecat-service";

const SIGN_IN_ROUTES = new Set(["/paywall", "/settings/account", "/settings/email"]);

export function purchaseResume(state: {
    accountId: string | null;
    entitlement: Entitlement;
    intent: PurchaseIntent | null;
    onTabs: boolean;
    pathname: string;
}): "drop" | "open" | null {
    const { accountId, entitlement, intent, onTabs, pathname } = state;
    if (intent === null) {
        return null;
    }
    if (accountId === null) {
        return SIGN_IN_ROUTES.has(pathname) ? null : "drop";
    }
    if (pathname === "/paywall" || entitlement.kind === "pro" || entitlement.kind === "unconfigured") {
        return "drop";
    }
    return onTabs && entitlement.kind === "free" && !entitlement.pending ? "open" : null;
}
